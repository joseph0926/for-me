//! ScreenCaptureKit으로 고른 영역이나 창의 프레임을 받는다.
//!
//! 녹화 결과에서 이 앱의 창(조작 막대, 녹화 범위 테두리)을 빼려고 화면 캡처 필터에서 이 앱을 제외한다.
//! macOS에서 Tauri의 `set_content_protected`가 쓰는 창 공유 차단 설정은 ScreenCaptureKit에 통하지
//! 않는다는 보고가 있어 그 설정에 기대지 않는다(`docs/research.md`의 창 내용 캡처 방지).

use std::{sync::Arc, time::Instant};

use screencapturekit::cm::SCFrameStatus;
use screencapturekit::prelude::*;
use screencapturekit::stream::ErrorHandler;

use super::{CapturedFrame, FRAME_INTERVAL, Interruption, Target, fit_into};
use crate::{
    frame_queue::FrameQueue,
    targets::{self, ScreenRect, WindowId},
};

/// ScreenCaptureKit이 앱에 넘기기 전에 쌓아 두는 프레임 수. 기본값이 Apple 웹 문서(3)와 SDK 헤더(8)에서
/// 달라 직접 정한다. 콜백은 복사만 하고 바로 돌려주므로 웹 문서의 기본값을 쓴다.
const CAPTURE_QUEUE_DEPTH: u32 = 3;

pub struct Capture {
    stream: SCStream,
}

/// 캡처할 대상과 받을 프레임의 픽셀 크기
struct Source {
    filter: SCContentFilter,
    /// 모니터 안에서 잘라 낼 범위(포인트). 창 녹화면 `None`.
    crop: Option<CGRect>,
    size: (u32, u32),
}

impl Capture {
    pub fn start(
        target: Target,
        started: Instant,
        queue: Arc<FrameQueue<CapturedFrame>>,
        interruption: Interruption,
    ) -> Result<Self, String> {
        let content = SCShareableContent::get().map_err(|e| {
            format!("화면 정보를 읽을 수 없습니다. 화면 기록 권한을 확인해 주세요: {e}")
        })?;
        let source = match target {
            Target::Region { rect } => region_source(&content, rect)?,
            Target::Window { id } => window_source(&content, id)?,
        };
        let interval = CMTime::new(FRAME_INTERVAL.as_millis() as i64, 1000);
        let mut configuration = SCStreamConfiguration::new()
            .with_width(source.size.0)
            .with_height(source.size.1)
            .with_pixel_format(PixelFormat::BGRA)
            .with_shows_cursor(true)
            .with_minimum_frame_interval(&interval)
            .with_queue_depth(CAPTURE_QUEUE_DEPTH);
        if let Some(crop) = source.crop {
            configuration = configuration.with_source_rect(crop);
        }

        // 녹화하던 창이 닫히거나 모니터가 빠지거나 권한이 회수되면 스트림이 스스로 멈춘다.
        // 요청한 정지는 여기로 오지 않는다.
        let on_stopped = ErrorHandler::new(move |error| {
            interruption.report(format!("화면 캡처가 멈춰 녹화를 끝냈습니다: {error}"));
        });
        let mut stream = SCStream::new_with_delegate(&source.filter, &configuration, on_stopped)
            .map_err(|e| e.to_string())?;
        let handler = FrameHandler {
            started,
            queue,
            size: source.size,
        };
        stream
            .add_output_handler(handler, SCStreamOutputType::Screen)
            .map_err(|e| e.to_string())?;
        stream.start_capture().map_err(|e| e.to_string())?;
        Ok(Self { stream })
    }

    pub fn stop(self) -> Result<(), String> {
        self.stream.stop_capture().map_err(|e| e.to_string())
    }
}

fn region_source(content: &SCShareableContent, rect: ScreenRect) -> Result<Source, String> {
    let monitor = targets::monitor_of(&rect).ok_or("영역이 놓인 모니터를 찾을 수 없습니다")?;
    let area = rect
        .intersect(&monitor.bounds)
        .ok_or("영역이 모니터 밖에 있습니다")?;
    let display = content
        .displays()
        .into_iter()
        .find(|display| display.display_id() == monitor.id)
        .ok_or("영역이 놓인 모니터를 녹화할 수 없습니다")?;

    let own_process_id = std::process::id() as i32;
    let applications = content.applications();
    let own_app = applications
        .iter()
        .find(|app| app.process_id() == own_process_id);
    let filter = SCContentFilter::create().with_display(&display);
    let filter = match own_app {
        Some(app) => filter.with_excluding_applications(&[app], &[]),
        None => {
            eprintln!("녹화에서 뺄 이 앱을 찾지 못해 조작 막대가 녹화될 수 있습니다");
            filter.with_excluding_windows(&[])
        }
    };

    // ScreenCaptureKit은 잘라 낼 범위를 모니터 안의 포인트로 받는다.
    let scale = targets::display_scale(monitor.id);
    let crop = CGRect::new(
        f64::from(area.left - monitor.bounds.left) / scale,
        f64::from(area.top - monitor.bounds.top) / scale,
        f64::from(area.width) / scale,
        f64::from(area.height) / scale,
    );
    Ok(Source {
        filter: filter.build().map_err(|e| e.to_string())?,
        crop: Some(crop),
        size: (area.width as u32, area.height as u32),
    })
}

fn window_source(content: &SCShareableContent, id: WindowId) -> Result<Source, String> {
    let window = content
        .windows()
        .into_iter()
        .find(|window| window.window_id() == id)
        .ok_or("창을 찾을 수 없습니다")?;
    let bounds = targets::window_bounds(id).ok_or("창을 찾을 수 없습니다")?;
    let filter = SCContentFilter::create()
        .with_window(&window)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(Source {
        filter,
        crop: None,
        size: (bounds.width as u32, bounds.height as u32),
    })
}

/// ScreenCaptureKit의 캡처 큐에서 프레임을 받아 복사한 뒤 변환 큐에 넣는다.
struct FrameHandler {
    started: Instant,
    queue: Arc<FrameQueue<CapturedFrame>>,
    /// 스트림에 요청한 프레임 크기. 다른 크기로 오면 이 크기에 맞춘다.
    size: (u32, u32),
}

impl SCStreamOutputTrait for FrameHandler {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, of_type: SCStreamOutputType) {
        if of_type != SCStreamOutputType::Screen {
            return;
        }
        // 화면이 바뀌지 않으면 픽셀 없이 상태만 담긴 프레임이 온다.
        if sample.frame_status() != Some(SCFrameStatus::Complete) {
            return;
        }
        let presented_at = self.started.elapsed();
        let Some(buffer) = sample.pixel_buffer() else {
            return;
        };
        let Ok(locked) = buffer.lock_read_only() else {
            return;
        };
        let (width, height) = (locked.width(), locked.height());
        // 잠근 동안에만 픽셀을 읽고, 잠금을 풀기 전에 복사를 끝낸다.
        let Some(data) = (unsafe { locked.as_slice() }) else {
            return;
        };
        let Some(rgba) = bgra_to_rgba(data, locked.bytes_per_row(), width, height) else {
            return;
        };
        drop(locked);

        let actual = (width as u32, height as u32);
        let pixels = if actual == self.size {
            rgba
        } else {
            let mut fitted = Vec::new();
            fit_into(&rgba, actual, self.size, &mut fitted);
            fitted
        };
        self.queue.push(CapturedFrame {
            pixels,
            width: self.size.0,
            height: self.size.1,
            presented_at,
        });
    }
}

/// 줄마다 여분 바이트가 붙을 수 있는 BGRA 픽셀을 여분 없는 RGBA로 옮긴다. 인코더는 불투명한 픽셀을
/// 받으므로 알파는 255로 둔다. 데이터가 크기보다 짧으면 `None`.
fn bgra_to_rgba(data: &[u8], bytes_per_row: usize, width: usize, height: usize) -> Option<Vec<u8>> {
    let row_bytes = width * 4;
    if height > 0
        && (bytes_per_row < row_bytes || data.len() < bytes_per_row * (height - 1) + row_bytes)
    {
        return None;
    }
    let mut rgba = Vec::with_capacity(row_bytes * height);
    for y in 0..height {
        let row = &data[y * bytes_per_row..y * bytes_per_row + row_bytes];
        for pixel in row.as_chunks::<4>().0 {
            rgba.extend_from_slice(&[pixel[2], pixel[1], pixel[0], 255]);
        }
    }
    Some(rgba)
}

/// 파일 이름에 쓸 현지 날짜와 시각(YYYYMMDD-HHMMSS)
pub fn local_timestamp() -> String {
    let now = unsafe { libc::time(std::ptr::null_mut()) };
    let mut time: libc::tm = unsafe { std::mem::zeroed() };
    if unsafe { libc::localtime_r(&now, &mut time) }.is_null() {
        // 현지 시각을 구하지 못해도 저장은 이어 가도록 1970년부터 센 초를 쓴다.
        return now.to_string();
    }
    format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}",
        time.tm_year + 1900,
        time.tm_mon + 1,
        time.tm_mday,
        time.tm_hour,
        time.tm_min,
        time.tm_sec
    )
}

#[cfg(test)]
mod tests {
    use super::bgra_to_rgba;

    #[test]
    fn swaps_channels_drops_row_padding_and_makes_pixels_opaque() {
        // 2x2 픽셀, 줄마다 4바이트의 여분이 붙은 BGRA
        let data = [
            1, 2, 3, 0, 4, 5, 6, 7, 99, 99, 99, 99, //
            8, 9, 10, 11, 12, 13, 14, 15, 99, 99, 99, 99,
        ];
        assert_eq!(
            bgra_to_rgba(&data, 12, 2, 2),
            Some(vec![
                3, 2, 1, 255, 6, 5, 4, 255, 10, 9, 8, 255, 14, 13, 12, 255
            ])
        );
    }

    #[test]
    fn short_data_is_rejected() {
        assert_eq!(bgra_to_rgba(&[0; 7], 8, 2, 1), None);
    }
}
