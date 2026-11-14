use std::time::Duration;

use super::*;

const W: usize = 32;
const H: usize = 16;

fn ms(value: u64) -> Duration {
    Duration::from_millis(value)
}

fn solid(color: [u8; 3]) -> Vec<u8> {
    let mut pixels = Vec::with_capacity(W * H * 4);
    for _ in 0..W * H {
        pixels.extend_from_slice(&[color[0], color[1], color[2], 255]);
    }
    pixels
}

/// 픽셀마다 색이 다른 프레임. 512색이라 색 줄이기를 거친다.
fn gradient() -> Vec<u8> {
    let mut pixels = Vec::with_capacity(W * H * 4);
    for y in 0..H {
        for x in 0..W {
            pixels.extend_from_slice(&[(x * 8) as u8, (y * 16) as u8, ((x + y) * 5) as u8, 255]);
        }
    }
    pixels
}

fn paint(pixels: &mut [u8], left: usize, top: usize, width: usize, height: usize, color: [u8; 3]) {
    for y in top..top + height {
        for x in left..left + width {
            let i = (y * W + x) * 4;
            pixels[i..i + 3].copy_from_slice(&color);
        }
    }
}

fn encode(frames: &[(&[u8], Duration)], ended_at: Duration, quality: Quality) -> Vec<u8> {
    let mut encoder = GifEncoder::new(Vec::new(), W as u16, H as u16, quality).unwrap();
    for (pixels, at) in frames {
        encoder.add_frame(pixels, *at).unwrap();
    }
    encoder.finish(ended_at).unwrap()
}

struct Shown {
    /// 이 프레임을 그린 뒤 화면 전체(RGB)
    screen: Vec<u8>,
    delay: u16,
    rect: (u16, u16, u16, u16),
}

fn play(bytes: &[u8]) -> Vec<Shown> {
    play_sized(bytes, W, H)
}

/// GIF를 재생기처럼 앞 화면 위에 덧그려, 프레임마다 보이는 화면을 돌려준다.
fn play_sized(bytes: &[u8], width: usize, height: usize) -> Vec<Shown> {
    let mut options = gif::DecodeOptions::new();
    options.set_color_output(gif::ColorOutput::RGBA);
    let mut decoder = options.read_info(bytes).unwrap();
    let mut screen = vec![0u8; width * height * 3];
    let mut shown = Vec::new();
    while let Some(frame) = decoder.read_next_frame().unwrap() {
        assert_eq!(frame.dispose, gif::DisposalMethod::Keep);
        let (left, top) = (frame.left as usize, frame.top as usize);
        for y in 0..frame.height as usize {
            for x in 0..frame.width as usize {
                let s = (y * frame.width as usize + x) * 4;
                if frame.buffer[s + 3] == 0 {
                    continue;
                }
                let d = ((top + y) * width + left + x) * 3;
                screen[d..d + 3].copy_from_slice(&frame.buffer[s..s + 3]);
            }
        }
        shown.push(Shown {
            screen: screen.clone(),
            delay: frame.delay,
            rect: (frame.left, frame.top, frame.width, frame.height),
        });
    }
    shown
}

fn rgb(rgba: &[u8]) -> Vec<u8> {
    rgba.as_chunks::<4>()
        .0
        .iter()
        .flat_map(|p| [p[0], p[1], p[2]])
        .collect()
}

#[test]
fn reproduces_frames_with_few_colors_exactly() {
    let first = solid([255, 255, 255]);
    let mut second = first.clone();
    paint(&mut second, 2, 3, 5, 4, [200, 30, 30]);
    // 떨어진 두 곳을 바꿔, 바뀐 사각형 안에 바뀌지 않은 픽셀이 섞이게 한다.
    let mut third = second.clone();
    paint(&mut third, 1, 1, 2, 2, [20, 90, 220]);
    paint(&mut third, 26, 12, 4, 3, [30, 160, 60]);

    let gif = encode(
        &[(&first, ms(0)), (&second, ms(100)), (&third, ms(200))],
        ms(300),
        Quality::Standard,
    );

    let shown = play(&gif);
    assert_eq!(shown.len(), 3);
    assert_eq!(shown[0].screen, rgb(&first));
    assert_eq!(shown[1].screen, rgb(&second));
    assert_eq!(shown[2].screen, rgb(&third));
}

#[test]
fn a_large_changed_area_is_reproduced_exactly() {
    // 바뀐 영역이 넓으면 색 찾기를 여러 스레드로 나눈다. 줄마다 색을 달리해 줄 위치가 어긋나면 드러나게 한다.
    const WIDTH: usize = 400;
    const HEIGHT: usize = 240;
    const { assert!(WIDTH * HEIGHT >= PARALLEL_MIN_PIXELS) };
    let first = vec![255u8; WIDTH * HEIGHT * 4];
    let mut second = first.clone();
    for y in 0..HEIGHT {
        // 첫 열은 그대로 두어 바뀌지 않은 픽셀이 섞이게 한다.
        for x in 1..WIDTH {
            let i = (y * WIDTH + x) * 4;
            second[i..i + 3].copy_from_slice(&[y as u8, 40, 200]);
        }
    }

    let mut encoder =
        GifEncoder::new(Vec::new(), WIDTH as u16, HEIGHT as u16, Quality::Standard).unwrap();
    encoder.add_frame(&first, ms(0)).unwrap();
    encoder.add_frame(&second, ms(100)).unwrap();
    let gif = encoder.finish(ms(200)).unwrap();

    let shown = play_sized(&gif, WIDTH, HEIGHT);
    assert_eq!(shown[1].screen, rgb(&second));
}

#[test]
fn writes_only_the_changed_rectangle_after_the_first_frame() {
    let first = solid([255, 255, 255]);
    let mut second = first.clone();
    paint(&mut second, 10, 5, 10, 3, [0, 0, 0]);

    let gif = encode(
        &[(&first, ms(0)), (&second, ms(100))],
        ms(200),
        Quality::Standard,
    );

    let shown = play(&gif);
    assert_eq!(shown[0].rect, (0, 0, W as u16, H as u16));
    assert_eq!(shown[1].rect, (10, 5, 10, 3));
}

#[test]
fn unchanged_pixels_keep_the_previous_output_when_colors_are_reduced() {
    let first = gradient();
    let mut second = gradient();
    // 바뀐 사각형 안에 색이 많아 색 줄이기를 거치고, 가운데 픽셀은 바뀌지 않는다.
    for y in 2..12 {
        for x in 4..28 {
            if (x, y) == (16, 7) {
                continue;
            }
            let i = (y * W + x) * 4;
            second[i] = second[i].wrapping_add(97);
            second[i + 1] = second[i + 1].wrapping_add(51);
        }
    }

    let gif = encode(
        &[(&first, ms(0)), (&second, ms(100))],
        ms(200),
        Quality::High,
    );

    let shown = play(&gif);
    let (before, after) = (&shown[0].screen, &shown[1].screen);
    for y in 0..H {
        for x in 0..W {
            let inside_change = (4..28).contains(&x) && (2..12).contains(&y);
            if !inside_change || (x, y) == (16, 7) {
                let i = (y * W + x) * 3;
                assert_eq!(
                    after[i..i + 3],
                    before[i..i + 3],
                    "pixel ({x}, {y}) changed"
                );
            }
        }
    }
}

#[test]
fn delays_follow_the_frame_timestamps() {
    let a = solid([10, 10, 10]);
    let b = solid([20, 20, 20]);
    let c = solid([30, 30, 30]);

    let gif = encode(
        &[(&a, ms(0)), (&b, ms(100)), (&c, ms(250))],
        ms(400),
        Quality::Standard,
    );

    let delays: Vec<u16> = play(&gif).iter().map(|s| s.delay).collect();
    assert_eq!(delays, vec![10, 15, 15]);
}

#[test]
fn identical_frames_extend_the_previous_frame() {
    let a = solid([10, 10, 10]);
    let b = solid([20, 20, 20]);

    let gif = encode(
        &[(&a, ms(0)), (&a, ms(100)), (&b, ms(200))],
        ms(300),
        Quality::Standard,
    );

    let shown = play(&gif);
    let delays: Vec<u16> = shown.iter().map(|s| s.delay).collect();
    assert_eq!(delays, vec![20, 10]);
    assert_eq!(shown[1].screen, rgb(&b));
}

#[test]
fn frames_shorter_than_the_minimum_delay_are_replaced_by_the_next_frame() {
    let a = solid([10, 10, 10]);
    let b = solid([20, 20, 20]);
    let c = solid([30, 30, 30]);

    let gif = encode(
        &[(&a, ms(0)), (&b, ms(5)), (&c, ms(100))],
        ms(200),
        Quality::Standard,
    );

    let shown = play(&gif);
    let delays: Vec<u16> = shown.iter().map(|s| s.delay).collect();
    assert_eq!(delays, vec![10, 10]);
    assert_eq!(shown[0].screen, rgb(&b));
    assert_eq!(shown[1].screen, rgb(&c));
}

#[test]
fn a_replaced_frame_that_returns_to_the_previous_screen_keeps_the_timing() {
    let a = solid([10, 10, 10]);
    let b = solid([20, 20, 20]);

    // b가 쓰인 뒤 잠깐 a로 바뀌었다가 다시 b로 돌아온다.
    let gif = encode(
        &[(&a, ms(0)), (&b, ms(100)), (&a, ms(200)), (&b, ms(205))],
        ms(300),
        Quality::Standard,
    );

    let shown = play(&gif);
    let delays: Vec<u16> = shown.iter().map(|s| s.delay).collect();
    assert_eq!(delays.iter().map(|&d| d as u32).sum::<u32>(), 30);
    assert_eq!(shown.last().unwrap().screen, rgb(&b));
}

#[test]
fn rejects_a_buffer_of_the_wrong_size() {
    let mut encoder = GifEncoder::new(Vec::new(), W as u16, H as u16, Quality::Standard).unwrap();

    let error = encoder.add_frame(&[0; 12], ms(0)).unwrap_err();

    assert!(
        matches!(error, EncodeError::FrameSize { expected, actual: 12 } if expected == W * H * 4)
    );
}

#[test]
fn rejects_a_timestamp_earlier_than_the_previous_frame() {
    let mut encoder = GifEncoder::new(Vec::new(), W as u16, H as u16, Quality::Standard).unwrap();
    encoder.add_frame(&solid([0, 0, 0]), ms(100)).unwrap();

    let error = encoder.add_frame(&solid([9, 9, 9]), ms(50)).unwrap_err();

    assert!(matches!(error, EncodeError::TimestampWentBackwards { .. }));
}
