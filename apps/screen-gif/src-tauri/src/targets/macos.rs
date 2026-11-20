//! macOS의 창과 모니터 정보.
//!
//! CoreGraphics는 화면 좌표를 주 모니터 왼쪽 위가 원점인 포인트로 준다. Tauri(tao)는 macOS에서
//! 포인트에 그 모니터의 배율을 곱한 값을 물리 픽셀로 쓰므로(`MonitorHandle::position`), 여기서도
//! 같은 방식으로 바꿔 Tauri의 창 위치와 맞춘다. 배율이 다른 모니터가 섞이면 이렇게 만든 물리 픽셀
//! 좌표가 모니터 경계에서 어긋날 수 있는데, tao의 모니터 위치와 같은 한계다.

use objc2::MainThreadMarker;
use objc2_app_kit::NSScreen;
use objc2_core_foundation::{
    CFArray, CFDictionary, CFNumber, CFRetained, CFString, CFType, CGPoint, CGRect, Type,
};
use objc2_core_graphics::{
    CGDisplayBounds, CGDisplayCopyDisplayMode, CGDisplayMode, CGError, CGGetActiveDisplayList,
    CGPreflightScreenCaptureAccess, CGRectMakeWithDictionaryRepresentation,
    CGRequestScreenCaptureAccess, CGWindowListCopyWindowInfo, CGWindowListOption, kCGNullWindowID,
    kCGWindowAlpha, kCGWindowBounds, kCGWindowLayer, kCGWindowName, kCGWindowNumber,
    kCGWindowOwnerName, kCGWindowOwnerPID,
};

use super::{MonitorArea, ScreenRect, WindowTarget};

/// `CGWindowID`
pub type WindowId = u32;
/// `CGDirectDisplayID`
pub type MonitorId = u32;

/// 화면 기록 권한이 없을 때 선택 오버레이에 보이는 안내
const PERMISSION_MESSAGE: &str = "화면 기록 권한이 필요합니다. 시스템 설정의 개인정보 보호 및 보안 > 화면 및 시스템 오디오 녹음에서 screen-gif를 허용한 뒤 앱을 다시 실행해 주세요. 터미널에서 실행했다면 그 터미널 앱을 허용합니다.";

/// 시스템 설정의 화면 및 시스템 오디오 녹음 화면
const SCREEN_CAPTURE_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/// 일반 앱 창이 놓이는 층. 메뉴 막대, Dock, 알림처럼 다른 층의 창은 녹화 대상으로 고르지 않는다.
const NORMAL_WINDOW_LAYER: i64 = 0;

/// 한 번에 확인하는 모니터 수의 상한
const MAX_DISPLAYS: usize = 16;

struct Display {
    id: MonitorId,
    /// 포인트 단위 화면 범위
    frame: CGRect,
    scale: f64,
}

impl Display {
    fn physical_bounds(&self) -> ScreenRect {
        to_physical(self.frame, self.scale)
    }

    /// 포인트 단위 점과 이 모니터 사이의 거리. 모니터 안이면 0이다.
    fn distance_to(&self, x: f64, y: f64) -> f64 {
        let frame = self.frame;
        let dx = (frame.origin.x - x)
            .max(0.0)
            .max(x - (frame.origin.x + frame.size.width));
        let dy = (frame.origin.y - y)
            .max(0.0)
            .max(y - (frame.origin.y + frame.size.height));
        dx.hypot(dy)
    }
}

fn active_displays() -> Vec<Display> {
    let mut ids = [0u32; MAX_DISPLAYS];
    let mut count = 0u32;
    let error =
        unsafe { CGGetActiveDisplayList(MAX_DISPLAYS as u32, ids.as_mut_ptr(), &mut count) };
    if error != CGError::Success {
        return Vec::new();
    }
    ids[..count as usize]
        .iter()
        .map(|&id| Display {
            id,
            frame: CGDisplayBounds(id),
            scale: display_scale(id),
        })
        .collect()
}

/// 모니터의 배율. 포인트 하나가 차지하는 픽셀 수
pub fn display_scale(id: MonitorId) -> f64 {
    let mode = CGDisplayCopyDisplayMode(id);
    let points = CGDisplayMode::width(mode.as_deref());
    let pixels = CGDisplayMode::pixel_width(mode.as_deref());
    if points == 0 || pixels == 0 {
        1.0
    } else {
        pixels as f64 / points as f64
    }
}

fn to_physical(rect: CGRect, scale: f64) -> ScreenRect {
    let left = (rect.origin.x * scale).round() as i32;
    let top = (rect.origin.y * scale).round() as i32;
    let right = ((rect.origin.x + rect.size.width) * scale).round() as i32;
    let bottom = ((rect.origin.y + rect.size.height) * scale).round() as i32;
    ScreenRect {
        left,
        top,
        width: right - left,
        height: bottom - top,
    }
}

/// Dock과 메뉴 막대를 뺀 모니터 범위(물리 픽셀). 모니터 범위와 같은 방식으로 물리 픽셀로 바꾼다.
///
/// AppKit은 주 모니터의 왼쪽 아래가 원점이고 위로 갈수록 커지는 포인트 좌표를 쓴다. CoreGraphics처럼
/// 주 모니터 왼쪽 위가 원점인 좌표로 뒤집어 같은 모니터를 찾는다.
pub fn usable_bounds(id: MonitorId, mtm: MainThreadMarker) -> Option<ScreenRect> {
    let screens = NSScreen::screens(mtm);
    // 첫 번째 화면이 메뉴 막대가 있는 주 모니터이고, AppKit 좌표의 원점이다.
    let primary_height = screens.firstObject()?.frame().size.height;
    let display_frame = CGDisplayBounds(id);
    let screen = screens
        .iter()
        .find(|screen| same_rect(flip(screen.frame(), primary_height), display_frame))?;
    Some(to_physical(
        flip(screen.visibleFrame(), primary_height),
        display_scale(id),
    ))
}

fn flip(rect: CGRect, primary_height: f64) -> CGRect {
    CGRect::new(
        CGPoint::new(
            rect.origin.x,
            primary_height - rect.origin.y - rect.size.height,
        ),
        rect.size,
    )
}

fn same_rect(a: CGRect, b: CGRect) -> bool {
    (a.origin.x - b.origin.x).abs() < 0.5
        && (a.origin.y - b.origin.y).abs() < 0.5
        && (a.size.width - b.size.width).abs() < 0.5
        && (a.size.height - b.size.height).abs() < 0.5
}

/// 화면 기록 권한이 있는지 확인한다. 없으면 권한을 요청하고 시스템 설정의 해당 화면을 연다.
///
/// 처음 요청할 때는 시스템 확인 창이 뜨고 이 앱이 설정 목록에 올라간다. 한 번 거절한 뒤에는 확인 창이
/// 뜨지 않으므로 설정 화면을 직접 연다. 허용한 뒤 앱을 다시 열라는 안내는 macOS가 설정 화면에서 띄운다.
pub fn ensure_capture_permission() -> bool {
    if CGPreflightScreenCaptureAccess() {
        return true;
    }
    CGRequestScreenCaptureAccess();
    if let Err(error) = std::process::Command::new("open")
        .arg(SCREEN_CAPTURE_SETTINGS_URL)
        .spawn()
    {
        eprintln!("화면 기록 권한 설정을 열 수 없습니다: {error}");
    }
    false
}

/// 포인트 단위 점이 속한 모니터. 어느 모니터에도 없으면 가장 가까운 모니터를 고른다.
fn display_near(displays: &[Display], x: f64, y: f64) -> Option<&Display> {
    displays
        .iter()
        .min_by(|a, b| a.distance_to(x, y).total_cmp(&b.distance_to(x, y)))
}

/// 포인트 단위 창 범위를 창 가운데가 놓인 모니터의 배율로 물리 픽셀로 바꾼다.
fn window_to_physical(displays: &[Display], frame: CGRect) -> Option<ScreenRect> {
    let center_x = frame.origin.x + frame.size.width / 2.0;
    let center_y = frame.origin.y + frame.size.height / 2.0;
    let display = display_near(displays, center_x, center_y)?;
    Some(to_physical(frame, display.scale))
}

/// 화면 좌표 한 점이 속한 모니터. 어느 모니터에도 없으면 가장 가까운 모니터를 고른다.
pub fn monitor_at(x: i32, y: i32) -> Option<MonitorArea> {
    // 물리 픽셀은 모니터마다 배율이 달라, 각 모니터의 배율로 포인트로 되돌려 거리를 잰다.
    let distance = |display: &Display| {
        display.distance_to(f64::from(x) / display.scale, f64::from(y) / display.scale)
    };
    let displays = active_displays();
    let display = displays
        .iter()
        .min_by(|a, b| distance(a).total_cmp(&distance(b)))?;
    Some(MonitorArea {
        id: display.id,
        bounds: display.physical_bounds(),
    })
}

/// 화면에 보이는 창을 위에 놓인 순서대로 돌려준다. 이 앱의 창과 바탕 화면은 뺀다.
///
/// 화면 기록 권한이 없으면 다른 앱의 창 제목을 읽을 수 없고 녹화도 시작할 수 없으므로, 권한을 요청하고
/// 안내 문구를 오류로 돌려준다.
pub fn visible_windows(own_process_id: u32) -> Result<Vec<WindowTarget>, String> {
    if !CGPreflightScreenCaptureAccess() {
        // 처음에는 시스템 확인 창이 뜨고, 이미 거절한 뒤에는 아무것도 뜨지 않는다.
        CGRequestScreenCaptureAccess();
        return Err(PERMISSION_MESSAGE.to_string());
    }
    let displays = active_displays();
    // 화면에 보이는 창만 앞에 놓인 순서대로 받는다.
    let options =
        CGWindowListOption::OptionOnScreenOnly | CGWindowListOption::ExcludeDesktopElements;
    let Some(list) = CGWindowListCopyWindowInfo(options, kCGNullWindowID) else {
        return Ok(Vec::new());
    };
    Ok(window_infos(&list)
        .into_iter()
        .filter_map(|info| describe_window(&info, &displays, own_process_id))
        .collect())
}

fn describe_window(
    info: &CFDictionary<CFString, CFType>,
    displays: &[Display],
    own_process_id: u32,
) -> Option<WindowTarget> {
    if number(info, unsafe { kCGWindowLayer })? != NORMAL_WINDOW_LAYER {
        return None;
    }
    if number(info, unsafe { kCGWindowOwnerPID })? == i64::from(own_process_id) {
        return None;
    }
    // 완전히 투명한 창은 화면에 보이지 않는다.
    let alpha = info
        .get(unsafe { kCGWindowAlpha })
        .and_then(|value| value.downcast_ref::<CFNumber>().and_then(CFNumber::as_f64));
    if alpha == Some(0.0) {
        return None;
    }
    let bounds = window_to_physical(displays, frame(info)?)?;
    if bounds.width <= 0 || bounds.height <= 0 {
        return None;
    }
    // macOS 창은 제목이 없는 경우가 많아, 제목이 없으면 앱 이름을 쓴다.
    let title = text(info, unsafe { kCGWindowName })
        .filter(|title| !title.is_empty())
        .or_else(|| text(info, unsafe { kCGWindowOwnerName }))
        .unwrap_or_default();
    Some(WindowTarget {
        id: u32::try_from(number(info, unsafe { kCGWindowNumber })?).ok()?,
        title,
        bounds,
    })
}

/// 창 번호가 가리키는 창의 현재 화면 범위
pub fn window_bounds(id: WindowId) -> Option<ScreenRect> {
    let list = CGWindowListCopyWindowInfo(CGWindowListOption::OptionIncludingWindow, id)?;
    let info = window_infos(&list).into_iter().next()?;
    window_to_physical(&active_displays(), frame(&info)?)
}

/// `CGWindowListCopyWindowInfo`가 돌려준 배열의 창 정보. 각 항목은 문자열 키의 사전이다.
fn window_infos(list: &CFArray) -> Vec<CFRetained<CFDictionary<CFString, CFType>>> {
    // 항목의 종류를 확인한 뒤에 사전으로 다룬다.
    let items = unsafe { list.cast_unchecked::<CFType>() };
    items
        .iter()
        .filter_map(|item| {
            let dictionary = item.downcast_ref::<CFDictionary>()?;
            // Apple 문서상 창 정보 사전의 키는 모두 CFString이다.
            let typed = unsafe { dictionary.cast_unchecked::<CFString, CFType>() };
            Some(typed.retain())
        })
        .collect()
}

fn number(info: &CFDictionary<CFString, CFType>, key: &CFString) -> Option<i64> {
    info.get(key)?.downcast_ref::<CFNumber>()?.as_i64()
}

fn text(info: &CFDictionary<CFString, CFType>, key: &CFString) -> Option<String> {
    Some(info.get(key)?.downcast_ref::<CFString>()?.to_string())
}

/// 창의 포인트 단위 범위
fn frame(info: &CFDictionary<CFString, CFType>) -> Option<CGRect> {
    let value = info.get(unsafe { kCGWindowBounds })?;
    let dictionary = value.downcast_ref::<CFDictionary>()?;
    let mut rect = CGRect::default();
    unsafe { CGRectMakeWithDictionaryRepresentation(Some(dictionary), &mut rect) }.then_some(rect)
}

#[cfg(test)]
mod tests {
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};

    use super::{Display, to_physical};
    use crate::targets::ScreenRect;

    fn points(x: f64, y: f64, width: f64, height: f64) -> CGRect {
        CGRect::new(CGPoint::new(x, y), CGSize::new(width, height))
    }

    #[test]
    fn retina_points_become_twice_as_many_pixels() {
        assert_eq!(
            to_physical(points(10.5, 20.0, 100.0, 50.25), 2.0),
            ScreenRect {
                left: 21,
                top: 40,
                width: 200,
                height: 101,
            }
        );
    }

    #[test]
    fn distance_is_zero_inside_and_grows_outside() {
        let display = Display {
            id: 1,
            frame: points(0.0, 0.0, 1280.0, 832.0),
            scale: 2.0,
        };
        assert_eq!(display.distance_to(640.0, 400.0), 0.0);
        assert_eq!(display.distance_to(1290.0, 400.0), 10.0);
    }
}
