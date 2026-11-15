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
    sync::Arc,
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

/// 캡처한 화면 한 장. 불투명한 RGBA 픽셀이고, 크기는 첫 프레임 크기로 맞춰져 있다.
struct CapturedFrame {
    pixels: Vec<u8>,
    width: u32,
    height: u32,
    presented_at: Duration,
}

impl Recording {
    pub fn start(target: Target, save_dir: &Path) -> Result<Self, String> {
        fs::create_dir_all(save_dir).map_err(|e| format!("저장 폴더를 만들 수 없습니다: {e}"))?;
        let part_path = save_dir.join(format!(".screen-gif-{}.gif.part", unix_millis()));
        let part_file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&part_path)
            .map_err(|e| format!("임시 파일을 만들 수 없습니다: {e}"))?;

        let queue = Arc::new(FrameQueue::new(QUEUE_CAPACITY));
        let converter = {
            let queue = Arc::clone(&queue);
            std::thread::spawn(move || convert(&queue, part_file))
        };
        let started = Instant::now();
        match Capture::start(target, started, Arc::clone(&queue)) {
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

    /// 녹화를 멈추고 GIF를 저장한 경로를 돌려준다.
    pub fn stop(self) -> Result<PathBuf, String> {
        let ended_at = self.started.elapsed();
        let stopped = self.capture.stop();
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
        let result = match (stopped, converted) {
            (Err(error), _) => Err(format!("녹화를 멈추는 중 오류가 났습니다: {error}")),
            (Ok(()), Err(error)) => Err(error),
            (Ok(()), Ok(None)) => Err("녹화된 화면이 없습니다".to_string()),
            (Ok(()), Ok(Some(encoder))) => {
                finish(encoder, ended_at, &self.part_path, &self.save_dir)
            }
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

/// 변환 스레드. 큐가 닫힐 때까지 프레임을 꺼내 GIF로 쓴다. 취소되면 `None`.
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
            .add_frame(&frame.pixels, frame.presented_at)
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

    // 같은 이름의 파일을 덮어쓰지 않도록, 비어 있는 이름을 먼저 차지한 뒤 그 자리로 옮긴다.
    let final_path = reserve_name(save_dir)?;
    fs::rename(part_path, &final_path)
        .map_err(|e| format!("GIF 파일 이름을 바꿀 수 없습니다: {e}"))?;
    Ok(final_path)
}

fn reserve_name(save_dir: &Path) -> Result<PathBuf, String> {
    let stamp = local_timestamp();
    for attempt in 1..1000 {
        let name = if attempt == 1 {
            format!("screen-gif-{stamp}.gif")
        } else {
            format!("screen-gif-{stamp}-{attempt}.gif")
        };
        let path = save_dir.join(name);
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(_) => return Ok(path),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("저장할 파일을 만들 수 없습니다: {error}")),
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
    use super::fit_into;

    fn image(width: usize, height: usize, value: u8) -> Vec<u8> {
        vec![value; width * height * 4]
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
