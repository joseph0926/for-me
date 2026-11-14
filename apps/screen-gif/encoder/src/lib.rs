//! 녹화한 화면 프레임을 GIF로 저장한다.
//!
//! 화면 녹화는 프레임 사이에 바뀌는 부분이 작다. 그래서 첫 프레임만 전체를 쓰고, 이후에는
//! 앞서 쓴 프레임과 달라진 사각형만 쓴다. 그 사각형 안에서도 바뀌지 않은 픽셀은 투명으로
//! 두어 앞 프레임이 그대로 보이게 한다. 같은 화면이 이어지면 새 프레임을 쓰지 않고 앞
//! 프레임의 표시 시간을 늘린다.

use std::{borrow::Cow, collections::HashMap, fmt, io::Write, time::Duration};

use color_quant::NeuQuant;

/// GIF 프레임 하나가 가질 수 있는 색 수. 마지막 칸은 투명 색으로 예약한다.
const MAX_COLORS: usize = 256;
const MAX_OPAQUE_COLORS: usize = MAX_COLORS - 1;

/// 주요 브라우저는 2/100초보다 짧은 표시 시간을 1/10초로 바꿔 재생한다.
/// 이보다 짧게 이어지는 프레임은 다음 프레임으로 대체해 재생 속도가 틀어지지 않게 한다.
const MIN_DELAY_CENTIS: u64 = 2;

/// 이보다 작은 영역은 스레드를 나누는 비용이 색 찾기보다 커서 한 스레드로 처리한다.
const PARALLEL_MIN_PIXELS: usize = 64 * 1024;

/// 색이 256개를 넘는 영역의 색을 줄일 때의 정확도.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Quality {
    /// GitHub 첨부처럼 빠른 변환이 우선인 경우
    Standard,
    /// 블로그와 문서처럼 색 재현이 우선인 경우. 변환이 더 느리다.
    High,
}

impl Quality {
    /// NeuQuant의 표본 간격. 1이 가장 정확하고 느리다.
    fn sample_factor(self) -> i32 {
        match self {
            Quality::Standard => 10,
            Quality::High => 1,
        }
    }
}

#[derive(Debug)]
pub enum EncodeError {
    /// 프레임 버퍼 길이가 너비 x 높이 x 4(RGBA)가 아니다.
    FrameSize {
        expected: usize,
        actual: usize,
    },
    /// 프레임 시각이 앞 프레임보다 이르다.
    TimestampWentBackwards {
        previous: Duration,
        current: Duration,
    },
    Gif(gif::EncodingError),
}

impl fmt::Display for EncodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EncodeError::FrameSize { expected, actual } => {
                write!(
                    f,
                    "프레임 버퍼 길이가 {actual}바이트입니다. {expected}바이트여야 합니다"
                )
            }
            EncodeError::TimestampWentBackwards { previous, current } => {
                write!(
                    f,
                    "프레임 시각 {current:?}이 앞 프레임 시각 {previous:?}보다 이릅니다"
                )
            }
            EncodeError::Gif(error) => write!(f, "GIF 쓰기 실패: {error}"),
        }
    }
}

impl std::error::Error for EncodeError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            EncodeError::Gif(error) => Some(error),
            _ => None,
        }
    }
}

impl From<gif::EncodingError> for EncodeError {
    fn from(error: gif::EncodingError) -> Self {
        EncodeError::Gif(error)
    }
}

/// 표시 시간이 정해지지 않은 프레임. 다음 프레임이 오거나 녹화가 끝나야 쓸 수 있다.
struct PendingFrame {
    pixels: Vec<u8>,
    presented_at: Duration,
    start_centis: u64,
}

/// 프레임 안에서 앞 프레임과 달라진 사각형
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Rect {
    left: usize,
    top: usize,
    width: usize,
    height: usize,
}

pub struct GifEncoder<W: Write> {
    encoder: gif::Encoder<W>,
    width: usize,
    height: usize,
    quality: Quality,
    pending: Option<PendingFrame>,
    /// 마지막으로 쓴 프레임의 원본 픽셀. 다음 프레임과 비교하는 기준이다.
    last_written: Option<Vec<u8>>,
}

impl<W: Write> GifEncoder<W> {
    pub fn new(writer: W, width: u16, height: u16, quality: Quality) -> Result<Self, EncodeError> {
        let mut encoder = gif::Encoder::new(writer, width, height, &[])?;
        encoder.set_repeat(gif::Repeat::Infinite)?;
        Ok(Self {
            encoder,
            width: width as usize,
            height: height as usize,
            quality,
            pending: None,
            last_written: None,
        })
    }

    /// `rgba`는 불투명한 RGBA 픽셀이고, `presented_at`은 녹화 시작부터 이 화면이 보인 시각이다.
    pub fn add_frame(&mut self, rgba: &[u8], presented_at: Duration) -> Result<(), EncodeError> {
        let expected = self.width * self.height * 4;
        if rgba.len() != expected {
            return Err(EncodeError::FrameSize {
                expected,
                actual: rgba.len(),
            });
        }
        let start_centis = to_centis(presented_at);

        let Some(pending) = self.pending.as_mut() else {
            self.pending = Some(PendingFrame {
                pixels: rgba.to_vec(),
                presented_at,
                start_centis,
            });
            return Ok(());
        };
        if presented_at < pending.presented_at {
            return Err(EncodeError::TimestampWentBackwards {
                previous: pending.presented_at,
                current: presented_at,
            });
        }
        if rgba == pending.pixels.as_slice() {
            return Ok(());
        }
        if start_centis - pending.start_centis < MIN_DELAY_CENTIS {
            pending.pixels.copy_from_slice(rgba);
            return Ok(());
        }

        let delay = start_centis - pending.start_centis;
        let finished = self.pending.replace(PendingFrame {
            pixels: rgba.to_vec(),
            presented_at,
            start_centis,
        });
        if let Some(finished) = finished {
            self.write(finished.pixels, delay)?;
        }
        Ok(())
    }

    /// 마지막 프레임을 `ended_at`까지 보이게 쓰고 GIF를 마친다.
    pub fn finish(mut self, ended_at: Duration) -> Result<W, EncodeError> {
        if let Some(last) = self.pending.take() {
            let delay = to_centis(ended_at)
                .saturating_sub(last.start_centis)
                .max(MIN_DELAY_CENTIS);
            self.write(last.pixels, delay)?;
        }
        Ok(self.encoder.into_inner()?)
    }

    fn write(&mut self, pixels: Vec<u8>, delay_centis: u64) -> Result<(), EncodeError> {
        let full = Rect {
            left: 0,
            top: 0,
            width: self.width,
            height: self.height,
        };
        let mut frame = match &self.last_written {
            None => encode_region(&pixels, None, self.width, full, self.quality),
            Some(previous) => match changed_rect(previous, &pixels, self.width, self.height) {
                Some(rect) => {
                    encode_region(&pixels, Some(previous), self.width, rect, self.quality)
                }
                // 최소 표시 시간 때문에 대체된 프레임이 결국 앞 프레임과 같아진 경우.
                // 화면은 그대로 두고 표시 시간만 잇는 투명한 1픽셀 프레임을 쓴다.
                None => transparent_pixel_frame(),
            },
        };
        frame.delay = delay_centis.min(u16::MAX as u64) as u16;
        frame.dispose = gif::DisposalMethod::Keep;
        self.encoder.write_frame(&frame)?;
        self.last_written = Some(pixels);
        Ok(())
    }
}

fn to_centis(time: Duration) -> u64 {
    ((time.as_micros() + 5_000) / 10_000) as u64
}

fn same_color(a: &[u8], b: &[u8], index: usize) -> bool {
    let i = index * 4;
    a[i..i + 3] == b[i..i + 3]
}

fn changed_rect(previous: &[u8], current: &[u8], width: usize, height: usize) -> Option<Rect> {
    let (mut left, mut top, mut right, mut bottom) = (width, height, 0, 0);
    for y in 0..height {
        for x in 0..width {
            if !same_color(previous, current, y * width + x) {
                left = left.min(x);
                right = right.max(x);
                top = top.min(y);
                bottom = bottom.max(y);
            }
        }
    }
    (left <= right).then(|| Rect {
        left,
        top,
        width: right - left + 1,
        height: bottom - top + 1,
    })
}

/// 바뀐 색을 표현할 팔레트. 색이 255개 이하면 그대로 쓰고, 넘으면 NeuQuant로 줄인다.
enum Palette {
    Exact {
        rgb: Vec<u8>,
        index: HashMap<[u8; 3], u8>,
    },
    Quantized(NeuQuant),
}

impl Palette {
    fn build(opaque_rgba: &[u8], quality: Quality) -> Self {
        let mut index = HashMap::new();
        let mut rgb = Vec::new();
        for pixel in opaque_rgba.as_chunks::<4>().0 {
            let color = [pixel[0], pixel[1], pixel[2]];
            if index.contains_key(&color) {
                continue;
            }
            if index.len() == MAX_OPAQUE_COLORS {
                return Palette::Quantized(NeuQuant::new(
                    quality.sample_factor(),
                    MAX_OPAQUE_COLORS,
                    opaque_rgba,
                ));
            }
            index.insert(color, index.len() as u8);
            rgb.extend_from_slice(&color);
        }
        Palette::Exact { rgb, index }
    }

    fn rgb(&self) -> Vec<u8> {
        match self {
            Palette::Exact { rgb, .. } => rgb.clone(),
            Palette::Quantized(quantizer) => quantizer.color_map_rgb(),
        }
    }

    fn index_of(&self, pixel: &[u8]) -> u8 {
        match self {
            Palette::Exact { index, .. } => index[&[pixel[0], pixel[1], pixel[2]]],
            Palette::Quantized(quantizer) => {
                quantizer.index_of(&[pixel[0], pixel[1], pixel[2], 255]) as u8
            }
        }
    }
}

fn encode_region(
    pixels: &[u8],
    previous: Option<&[u8]>,
    width: usize,
    rect: Rect,
    quality: Quality,
) -> gif::Frame<'static> {
    let is_changed = |x: usize, y: usize| {
        previous.is_none_or(|previous| !same_color(previous, pixels, y * width + x))
    };

    let mut changed_rgba = Vec::new();
    for y in rect.top..rect.top + rect.height {
        for x in rect.left..rect.left + rect.width {
            if is_changed(x, y) {
                let i = (y * width + x) * 4;
                changed_rgba.extend_from_slice(&pixels[i..i + 3]);
                changed_rgba.push(255);
            }
        }
    }
    let palette = Palette::build(&changed_rgba, quality);
    let mut palette_rgb = palette.rgb();
    let transparent_index = (palette_rgb.len() / 3) as u8;
    let has_unchanged = changed_rgba.len() / 4 < rect.width * rect.height;
    if has_unchanged {
        palette_rgb.extend_from_slice(&[0, 0, 0]);
    }

    let mut indices = vec![0u8; rect.width * rect.height];
    let fill_rows = |first_row: usize, rows: &mut [u8]| {
        for (offset, row) in rows.chunks_mut(rect.width).enumerate() {
            let y = rect.top + first_row + offset;
            for (column, index) in row.iter_mut().enumerate() {
                let x = rect.left + column;
                *index = if is_changed(x, y) {
                    let i = (y * width + x) * 4;
                    palette.index_of(&pixels[i..i + 4])
                } else {
                    transparent_index
                };
            }
        }
    };
    // 넓은 영역이 바뀌면 색 찾기가 프레임 시간의 절반을 차지해, 줄 단위로 나눠 여러 코어에서 찾는다.
    // 픽셀마다 같은 팔레트에서 독립적으로 찾으므로 나눠도 결과는 같다.
    let workers = std::thread::available_parallelism().map_or(1, |n| n.get());
    if workers > 1 && indices.len() >= PARALLEL_MIN_PIXELS {
        let rows_per_worker = rect.height.div_ceil(workers);
        std::thread::scope(|scope| {
            for (chunk, rows) in indices.chunks_mut(rows_per_worker * rect.width).enumerate() {
                let fill_rows = &fill_rows;
                scope.spawn(move || fill_rows(chunk * rows_per_worker, rows));
            }
        });
    } else {
        fill_rows(0, &mut indices);
    }

    gif::Frame {
        left: rect.left as u16,
        top: rect.top as u16,
        width: rect.width as u16,
        height: rect.height as u16,
        palette: Some(palette_rgb),
        transparent: has_unchanged.then_some(transparent_index),
        buffer: Cow::Owned(indices),
        ..gif::Frame::default()
    }
}

fn transparent_pixel_frame() -> gif::Frame<'static> {
    gif::Frame {
        width: 1,
        height: 1,
        palette: Some(vec![0, 0, 0]),
        transparent: Some(0),
        buffer: Cow::Owned(vec![0]),
        ..gif::Frame::default()
    }
}

#[cfg(test)]
mod tests;
