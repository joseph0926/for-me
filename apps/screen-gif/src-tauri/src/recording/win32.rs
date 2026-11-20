//! Windows.Graphics.Capture로 고른 영역이나 창의 프레임을 받는다.

use std::{sync::Arc, time::Instant};

use windows_capture::{
    capture::{CaptureControl, Context, GraphicsCaptureApiHandler},
    frame::Frame,
    graphics_capture_api::{GraphicsCaptureApi, InternalCaptureControl},
    monitor::Monitor,
    settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    },
    window::Window,
};

use super::{CapturedFrame, FRAME_INTERVAL, Interruption, Target, fit_into};
use crate::{
    frame_queue::FrameQueue,
    targets::{self, ScreenRect},
};

type BoxError = Box<dyn std::error::Error + Send + Sync>;

pub struct Capture {
    control: CaptureControl<Recorder, BoxError>,
}

impl Capture {
    pub fn start(
        target: Target,
        started: Instant,
        queue: Arc<FrameQueue<CapturedFrame>>,
        interruption: Interruption,
    ) -> Result<Self, String> {
        let started_capture = match target {
            Target::Region { rect } => {
                let monitor =
                    targets::monitor_of(&rect).ok_or("영역이 놓인 모니터를 찾을 수 없습니다")?;
                let area = rect
                    .intersect(&monitor.bounds)
                    .ok_or("영역이 모니터 밖에 있습니다")?;
                // 모니터 프레임 안에서의 위치로 바꾼다.
                let crop = ScreenRect {
                    left: area.left - monitor.bounds.left,
                    top: area.top - monitor.bounds.top,
                    ..area
                };
                let flags = RecorderFlags {
                    started,
                    crop: Some(crop),
                    queue,
                    interruption,
                };
                Recorder::start_free_threaded(settings(
                    Monitor::from_raw_hmonitor(monitor.id.0),
                    flags,
                ))
            }
            Target::Window { id } => {
                let flags = RecorderFlags {
                    started,
                    crop: None,
                    queue,
                    interruption,
                };
                let window = Window::from_raw_hwnd(id as *mut std::ffi::c_void);
                Recorder::start_free_threaded(settings(window, flags))
            }
        };
        started_capture
            .map(|control| Self { control })
            .map_err(|error| error.to_string())
    }

    pub fn stop(self) -> Result<(), String> {
        self.control.stop().map_err(|error| error.to_string())
    }
}

fn settings<T>(item: T, flags: RecorderFlags) -> Settings<RecorderFlags, T>
where
    T: TryInto<windows_capture::settings::GraphicsCaptureItemType>,
{
    // 운영체제가 지원하지 않는 설정을 요구하면 녹화가 시작되지 않으므로, 지원할 때만 바꾼다.
    let cursor = if GraphicsCaptureApi::is_cursor_settings_supported().unwrap_or(false) {
        CursorCaptureSettings::WithCursor
    } else {
        CursorCaptureSettings::Default
    };
    let border = if GraphicsCaptureApi::is_border_settings_supported().unwrap_or(false) {
        DrawBorderSettings::WithoutBorder
    } else {
        DrawBorderSettings::Default
    };
    let interval = if GraphicsCaptureApi::is_minimum_update_interval_supported().unwrap_or(false) {
        MinimumUpdateIntervalSettings::Custom(FRAME_INTERVAL)
    } else {
        MinimumUpdateIntervalSettings::Default
    };
    Settings::new(
        item,
        cursor,
        border,
        SecondaryWindowSettings::Default,
        interval,
        DirtyRegionSettings::Default,
        ColorFormat::Rgba8,
        flags,
    )
}

/// 파일 이름에 쓸 현지 날짜와 시각(YYYYMMDD-HHMMSS)
pub fn local_timestamp() -> String {
    let time = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}",
        time.wYear, time.wMonth, time.wDay, time.wHour, time.wMinute, time.wSecond
    )
}

struct RecorderFlags {
    started: Instant,
    /// 모니터 프레임에서 잘라 낼 영역. 창 녹화면 `None`.
    crop: Option<ScreenRect>,
    queue: Arc<FrameQueue<CapturedFrame>>,
    interruption: Interruption,
}

/// 캡처 스레드에서 프레임을 받아 복사한 뒤 변환 큐에 넣는다.
struct Recorder {
    started: Instant,
    crop: Option<ScreenRect>,
    queue: Arc<FrameQueue<CapturedFrame>>,
    interruption: Interruption,
    /// 첫 프레임의 크기. 이후 프레임을 이 크기에 맞춘다.
    size: Option<(u32, u32)>,
    unpadded: Vec<u8>,
}

impl GraphicsCaptureApiHandler for Recorder {
    type Flags = RecorderFlags;
    type Error = BoxError;

    fn new(context: Context<Self::Flags>) -> Result<Self, Self::Error> {
        let flags = context.flags;
        Ok(Self {
            started: flags.started,
            crop: flags.crop,
            queue: flags.queue,
            interruption: flags.interruption,
            size: None,
            unpadded: Vec::new(),
        })
    }

    /// 오류를 돌려주면 windows-capture가 캡처 스레드를 끝내므로, 그 전에 녹화가 멈췄다고 알린다.
    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        _capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        self.copy_frame(frame).inspect_err(|error| {
            self.interruption
                .report(format!("화면을 읽지 못해 녹화를 끝냈습니다: {error}"));
        })
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        self.interruption
            .report("녹화하던 창이 닫혀 녹화를 끝냈습니다".to_string());
        Ok(())
    }
}

impl Recorder {
    fn copy_frame(&mut self, frame: &mut Frame) -> Result<(), BoxError> {
        let presented_at = self.started.elapsed();
        let buffer = match self.crop {
            Some(crop) => {
                // 모니터 해상도가 바뀌어 프레임이 작아져도 프레임 안쪽만 자른다.
                let right = (crop.right() as u32).min(frame.width());
                let bottom = (crop.bottom() as u32).min(frame.height());
                frame.buffer_crop(crop.left as u32, crop.top as u32, right, bottom)?
            }
            None => frame.buffer()?,
        };
        let (width, height) = (buffer.width(), buffer.height());
        let pixels = buffer.as_nopadding_buffer(&mut self.unpadded);

        let size = *self.size.get_or_insert((width, height));
        let pixels = if (width, height) == size {
            pixels.to_vec()
        } else {
            // 녹화 중 창 크기가 바뀌면 첫 프레임 크기에 맞춰 넘치는 부분은 자르고 빈 곳은 검게 둔다.
            let mut fitted = Vec::new();
            fit_into(pixels, (width, height), size, &mut fitted);
            fitted
        };
        self.queue.push(CapturedFrame {
            pixels,
            width: size.0,
            height: size.1,
            presented_at,
        });
        Ok(())
    }
}
