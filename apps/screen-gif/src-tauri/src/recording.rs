//! 고른 영역이나 창을 녹화해 GIF 파일로 저장한다.
//!
//! 캡처 스레드는 프레임을 복사해 큐에 넣기만 하고, 변환 스레드가 꺼내 GIF로 변환한다. GIF는 같은 폴더의
//! `.part` 파일에 바로 써 나가고, 정지하면 겹치지 않는 이름으로 바꾼다. 취소하면 `.part` 파일을 지운다.
//! 화면 캡처는 운영체제마다 다르다. Windows는 Windows.Graphics.Capture(`win32`), macOS는
//! ScreenCaptureKit(`macos`)을 쓴다.

#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod win32;

#[cfg(target_os = "macos")]
use macos::{Capture, local_timestamp};
#[cfg(windows)]
use win32::{Capture, local_timestamp};

use std::{
    fs::{self, File, OpenOptions},
    io::{BufWriter, Write},
    path::{Path, PathBuf},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread::JoinHandle,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use screen_gif_encoder::{GifEncoder, Quality};
use serde::Deserialize;

use crate::{
    frame_queue::FrameQueue,
    targets::{ScreenRect, WindowId},
};

/// 시제품의 녹화 간격. 초당 10프레임이며, 품질 모드별 값은 실제 녹화를 재 본 뒤 정한다.
const FRAME_INTERVAL: Duration = Duration::from_millis(100);

/// 변환이 밀릴 때 기다리게 할 프레임 수. 초당 10프레임 기준 0.8초 분량이고,
/// 2077x1008 영역이면 약 67MB를 쓴다.
const QUEUE_CAPACITY: usize = 8;

type GifFile = GifEncoder<BufWriter<File>>;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Target {
    /// 화면의 물리 픽셀 좌표로 그린 영역
    Region {
        rect: ScreenRect,
    },
    Window {
        id: WindowId,
    },
}

pub struct Recording {
    capture: Capture,
    queue: Arc<FrameQueue<CapturedFrame>>,
    converter: JoinHandle<Result<Option<GifFile>, String>>,
    started: Instant,
    part_path: PathBuf,
    save_dir: PathBuf,
}

/// 사용자가 멈추기 전에 녹화가 끝났음을 알린다. 캡처와 변환이 함께 실패해도 처음 한 번만 알린다.
///
/// 캡처 스레드와 변환 스레드에서 불리므로, 알림을 받는 쪽은 그 스레드의 종료를 기다리는 정지를
/// 다른 스레드에서 해야 한다.
#[derive(Clone)]
pub struct Interruption(Arc<InterruptionState>);

struct InterruptionState {
    reported: AtomicBool,
    notify: Box<dyn Fn(String) + Send + Sync>,
}

impl Interruption {
    pub fn new(notify: impl Fn(String) + Send + Sync + 'static) -> Self {
        Self(Arc::new(InterruptionState {
            reported: AtomicBool::new(false),
            notify: Box::new(notify),
        }))
    }

    pub fn report(&self, reason: String) {
        if !self.0.reported.swap(true, Ordering::AcqRel) {
            (self.0.notify)(reason);
        }
    }
}

/// 캡처한 화면 한 장. 불투명한 RGBA 픽셀이고, 크기는 첫 프레임 크기로 맞춰져 있다.
struct CapturedFrame {
    pixels: Vec<u8>,
    width: u32,
    height: u32,
    presented_at: Duration,
}

impl Recording {
    /// 녹화를 시작한다. 캡처나 변환이 도중에 멈추면 `interruption`으로 이유를 알린다.
    pub fn start(
        target: Target,
        save_dir: &Path,
        interruption: Interruption,
    ) -> Result<Self, String> {
        fs::create_dir_all(save_dir).map_err(|e| format!("저장 폴더를 만들 수 없습니다: {e}"))?;
        let part_path = save_dir.join(format!(".screen-gif-{}.gif.part", unix_millis()));
        let part_file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&part_path)
            .map_err(|e| format!("임시 파일을 만들 수 없습니다: {e}"))?;

        let queue = Arc::new(FrameQueue::new(QUEUE_CAPACITY));
        let converter = spawn_converter(Arc::clone(&queue), part_file, interruption.clone());
        let started = Instant::now();
        match Capture::start(target, started, Arc::clone(&queue), interruption) {
            Ok(capture) => Ok(Self {
                capture,
                queue,
                converter,
                started,
                part_path,
                save_dir: save_dir.to_path_buf(),
            }),
            Err(error) => {
                queue.abort();
                let _ = converter.join();
                let _ = fs::remove_file(&part_path);
                Err(format!("녹화를 시작할 수 없습니다: {error}"))
            }
        }
    }

    /// 녹화를 시작한 뒤 지난 시간
    pub fn elapsed(&self) -> Duration {
        self.started.elapsed()
    }

    /// 녹화를 멈추고 GIF를 저장한 경로를 돌려준다.
    pub fn stop(self) -> Result<PathBuf, String> {
        let ended_at = self.started.elapsed();
        // 캡처 오류는 그 뒤의 화면을 받지 못했다는 뜻일 뿐이고, 그때까지 변환한 GIF는 온전하므로 저장한다.
        // 도중에 멈춘 사실은 `Interruption`이 알린다.
        if let Err(error) = self.capture.stop() {
            eprintln!("화면 캡처를 멈추는 중 오류가 났습니다: {error}");
        }
        // 캡처가 멈춘 뒤 큐를 닫아, 변환 스레드가 남은 프레임까지 변환하고 끝나게 한다.
        self.queue.close();
        let converted = self
            .converter
            .join()
            .unwrap_or_else(|_| Err("GIF 변환 스레드가 비정상 종료했습니다".to_string()));
        let dropped = self.queue.dropped();
        if dropped > 0 {
            eprintln!("변환이 밀려 버린 프레임: {dropped}");
        }
        let result = match converted {
            Err(error) => Err(error),
            Ok(None) => Err("녹화된 화면이 없습니다".to_string()),
            Ok(Some(encoder)) => finish(encoder, ended_at, &self.part_path, &self.save_dir),
        };
        if result.is_err() {
            let _ = fs::remove_file(&self.part_path);
        }
        result
    }

    pub fn cancel(self) {
        let _ = self.capture.stop();
        self.queue.abort();
        // 변환 스레드가 끝나며 파일 핸들을 닫아야 지울 수 있다.
        let _ = self.converter.join();
        let _ = fs::remove_file(&self.part_path);
    }
}

/// 변환 스레드를 띄운다. 변환에 실패하면 큐를 중단하고 녹화가 멈췄다고 알린다.
fn spawn_converter(
    queue: Arc<FrameQueue<CapturedFrame>>,
    file: File,
    interruption: Interruption,
) -> JoinHandle<Result<Option<GifFile>, String>> {
    std::thread::spawn(move || {
        let converted = convert(&queue, file);
        if converted.is_err() {
            // 변환을 이어 갈 수 없으므로 캡처한 프레임을 더 쌓지 않는다.
            queue.abort();
            interruption.report("GIF 변환에 실패해 녹화를 멈췄습니다".to_string());
        }
        converted
    })
}

/// 큐가 닫힐 때까지 프레임을 꺼내 GIF로 쓴다. 취소되면 `None`.
fn convert(queue: &FrameQueue<CapturedFrame>, file: File) -> Result<Option<GifFile>, String> {
    let mut file = Some(file);
    let mut encoder: Option<GifFile> = None;
    while let Some(frame) = queue.pop() {
        let encoder = match &mut encoder {
            Some(encoder) => encoder,
            None => {
                let file = file.take().ok_or("GIF 파일이 없습니다")?;
                let created = GifEncoder::new(
                    BufWriter::new(file),
                    frame.width as u16,
                    frame.height as u16,
                    Quality::Standard,
                )
                .map_err(|e| e.to_string())?;
                encoder.insert(created)
            }
        };
        encoder
            .add_frame(frame.pixels, frame.presented_at)
            .map_err(|e| e.to_string())?;
    }
    Ok(encoder)
}

fn finish(
    encoder: GifFile,
    ended_at: Duration,
    part_path: &Path,
    save_dir: &Path,
) -> Result<PathBuf, String> {
    let mut writer = encoder.finish(ended_at).map_err(|e| e.to_string())?;
    writer
        .flush()
        .map_err(|e| format!("GIF를 쓸 수 없습니다: {e}"))?;
    drop(writer);
    move_to_free_name(part_path, save_dir, &local_timestamp())
}

/// 완성한 `.part`를 날짜와 시각 이름으로 옮긴다. 같은 이름의 파일은 덮어쓰지 않고 뒤에 번호를 붙인다.
///
/// 빈 파일로 이름을 먼저 차지한 뒤 그 위로 덮어 옮기면, 직후에 연 Windows 탐색기가 새 파일을 고르지
/// 못한다(QA-017). 하드 링크는 이름이 이미 있으면 실패하므로, 덮어쓰지 않으면서 완성된 파일이 한 번에
/// 새 이름으로 나타난다.
fn move_to_free_name(part_path: &Path, save_dir: &Path, stamp: &str) -> Result<PathBuf, String> {
    for attempt in 1..1000 {
        let name = if attempt == 1 {
            format!("screen-gif-{stamp}.gif")
        } else {
            format!("screen-gif-{stamp}-{attempt}.gif")
        };
        let path = save_dir.join(name);
        match fs::hard_link(part_path, &path) {
            Ok(()) => {
                // 저장은 끝났으므로 `.part`를 지우지 못해도 실패로 돌리지 않는다. 같은 내용을 가리키는
                // 링크라 디스크를 더 쓰지 않는다.
                if let Err(error) = fs::remove_file(part_path) {
                    eprintln!("임시 파일을 지울 수 없습니다: {error}");
                }
                return Ok(path);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("GIF 파일을 저장할 수 없습니다: {error}")),
        }
    }
    Err("저장할 파일 이름을 정할 수 없습니다".to_string())
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// 녹화 중 대상 크기가 바뀐 프레임을 첫 프레임 크기에 맞춘다. 넘치는 부분은 자르고 빈 곳은 검게 둔다.
fn fit_into(pixels: &[u8], from: (u32, u32), to: (u32, u32), out: &mut Vec<u8>) {
    let (from_w, from_h) = (from.0 as usize, from.1 as usize);
    let (to_w, to_h) = (to.0 as usize, to.1 as usize);
    out.clear();
    out.resize(to_w * to_h * 4, 0);
    for pixel in out.as_chunks_mut::<4>().0 {
        pixel[3] = 255;
    }
    let copy_w = from_w.min(to_w);
    for y in 0..from_h.min(to_h) {
        let src = y * from_w * 4;
        let dst = y * to_w * 4;
        out[dst..dst + copy_w * 4].copy_from_slice(&pixels[src..src + copy_w * 4]);
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs::{self, File},
        sync::{Arc, Mutex},
        time::Duration,
    };

    use super::{CapturedFrame, Interruption, fit_into, move_to_free_name, spawn_converter};
    use crate::frame_queue::FrameQueue;

    fn image(width: usize, height: usize, value: u8) -> Vec<u8> {
        vec![value; width * height * 4]
    }

    fn recorded_reasons() -> (Interruption, Arc<Mutex<Vec<String>>>) {
        let reasons = Arc::new(Mutex::new(Vec::new()));
        let interruption = {
            let reasons = Arc::clone(&reasons);
            Interruption::new(move |reason| reasons.lock().unwrap().push(reason))
        };
        (interruption, reasons)
    }

    #[test]
    fn a_conversion_failure_stops_the_queue_and_reports_once_while_recording() {
        let part_path = std::env::temp_dir().join(format!(
            "screen-gif-test-{}-{}.gif.part",
            std::process::id(),
            super::unix_millis()
        ));
        let file = File::create(&part_path).unwrap();
        let queue = Arc::new(FrameQueue::new(4));
        let (interruption, reasons) = recorded_reasons();
        let converter = spawn_converter(Arc::clone(&queue), file, interruption);

        // 1x1 프레임이라면서 픽셀은 3바이트뿐이라 인코더가 거절한다.
        queue.push(CapturedFrame {
            pixels: vec![0; 3],
            width: 1,
            height: 1,
            presented_at: Duration::ZERO,
        });
        // 큐를 닫지 않아도 변환 스레드가 스스로 끝나야 녹화 중에 알릴 수 있다.
        let converted = converter.join().unwrap();
        let _ = fs::remove_file(&part_path);

        assert!(converted.is_err());
        assert_eq!(reasons.lock().unwrap().len(), 1);
        // 중단된 큐는 캡처가 넣는 프레임을 더 받지 않는다.
        queue.push(CapturedFrame {
            pixels: image(1, 1, 0),
            width: 1,
            height: 1,
            presented_at: Duration::ZERO,
        });
        assert!(queue.pop().is_none());
    }

    #[test]
    fn saving_keeps_an_existing_file_with_the_same_name_and_removes_the_part_file() {
        let dir = std::env::temp_dir().join(format!(
            "screen-gif-test-{}-{}",
            std::process::id(),
            super::unix_millis()
        ));
        fs::create_dir_all(&dir).unwrap();
        let existing = dir.join("screen-gif-20261120-120000.gif");
        fs::write(&existing, b"earlier").unwrap();
        let part = dir.join(".screen-gif-1.gif.part");
        fs::write(&part, b"recorded").unwrap();

        let saved = move_to_free_name(&part, &dir, "20261120-120000");
        let existing_after = fs::read(&existing).unwrap();
        let part_left = part.exists();
        let saved_content = saved.as_ref().ok().map(|path| fs::read(path).unwrap());
        let _ = fs::remove_dir_all(&dir);

        assert_eq!(saved, Ok(dir.join("screen-gif-20261120-120000-2.gif")));
        assert_eq!(saved_content, Some(b"recorded".to_vec()));
        assert_eq!(existing_after, b"earlier");
        assert!(!part_left);
    }

    #[test]
    fn capture_and_conversion_failing_together_report_only_the_first_reason() {
        let (interruption, reasons) = recorded_reasons();
        interruption.clone().report("캡처".to_string());
        interruption.report("변환".to_string());

        assert_eq!(*reasons.lock().unwrap(), vec!["캡처".to_string()]);
    }

    #[test]
    fn larger_frame_is_cropped_to_the_first_frame_size() {
        let mut out = Vec::new();
        fit_into(&image(4, 3, 9), (4, 3), (2, 2), &mut out);
        assert_eq!(out, image(2, 2, 9));
    }

    #[test]
    fn smaller_frame_is_padded_with_opaque_black() {
        let mut out = Vec::new();
        fit_into(&image(1, 1, 9), (1, 1), (2, 1), &mut out);
        assert_eq!(out, vec![9, 9, 9, 9, 0, 0, 0, 255]);
    }
}
