//! 녹화 대상을 고르는 데 필요한 창과 모니터 정보.
//!
//! 좌표는 모두 화면의 물리 픽셀이다. 창과 모니터를 찾는 방법은 운영체제마다 다르며, 각 운영체제
//! 모듈이 물리 픽셀을 어떻게 얻는지 설명한다.

use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod win32;

#[cfg(target_os = "macos")]
pub use macos::{
    MonitorId, WindowId, display_scale, ensure_capture_permission, monitor_at, usable_bounds,
    visible_windows, window_bounds,
};
#[cfg(windows)]
pub use win32::{
    MonitorId, WindowId, ensure_capture_permission, monitor_at, usable_bounds, visible_windows,
    window_bounds,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScreenRect {
    pub left: i32,
    pub top: i32,
    pub width: i32,
    pub height: i32,
}

impl ScreenRect {
    pub fn right(&self) -> i32 {
        self.left + self.width
    }

    pub fn bottom(&self) -> i32 {
        self.top + self.height
    }

    pub fn center(&self) -> (i32, i32) {
        (self.left + self.width / 2, self.top + self.height / 2)
    }

    /// 두 사각형이 겹치는 부분. 겹치지 않으면 `None`.
    pub fn intersect(&self, other: &ScreenRect) -> Option<ScreenRect> {
        let left = self.left.max(other.left);
        let top = self.top.max(other.top);
        let right = self.right().min(other.right());
        let bottom = self.bottom().min(other.bottom());
        (left < right && top < bottom).then_some(ScreenRect {
            left,
            top,
            width: right - left,
            height: bottom - top,
        })
    }
}

/// 선택 오버레이에서 누를 수 있는 창
#[derive(Clone, Debug, Serialize)]
pub struct WindowTarget {
    /// 운영체제의 창 식별자. JavaScript 숫자로 오가도 정밀도를 잃지 않는 범위의 값이다.
    pub id: WindowId,
    pub title: String,
    pub bounds: ScreenRect,
}

pub struct MonitorArea {
    pub id: MonitorId,
    pub bounds: ScreenRect,
}

/// 녹화 대상이 놓인 모니터. 캡처, 조작 막대와 녹화 범위 테두리가 같은 모니터를 고르도록 모두 이 함수로 찾는다.
pub fn monitor_of(rect: &ScreenRect) -> Option<MonitorArea> {
    let (x, y) = rect.center();
    monitor_at(x, y)
}

#[cfg(test)]
mod tests {
    use super::ScreenRect;

    fn rect(left: i32, top: i32, width: i32, height: i32) -> ScreenRect {
        ScreenRect {
            left,
            top,
            width,
            height,
        }
    }

    #[test]
    fn intersect_keeps_only_the_overlap() {
        let monitor = rect(0, 0, 1920, 1080);
        assert_eq!(
            rect(1800, 1000, 300, 200).intersect(&monitor),
            Some(rect(1800, 1000, 120, 80))
        );
    }

    #[test]
    fn intersect_of_separate_rects_is_none() {
        assert_eq!(rect(0, 0, 10, 10).intersect(&rect(10, 0, 10, 10)), None);
    }
}
