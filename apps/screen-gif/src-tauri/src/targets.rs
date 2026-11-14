//! 녹화 대상을 고르는 데 필요한 Windows 창과 모니터 정보.
//!
//! 좌표는 모두 화면의 물리 픽셀이다. Tauri 앱은 모니터별 배율을 인식하는 프로세스로 실행되므로
//! Win32 API가 배율을 적용하지 않은 실제 픽셀 좌표를 돌려준다.

use std::ffi::c_void;

use serde::{Deserialize, Serialize};
use windows::Win32::{
    Foundation::{HWND, LPARAM, POINT, RECT},
    Graphics::{
        Dwm::{DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS, DwmGetWindowAttribute},
        Gdi::{GetMonitorInfoW, HMONITOR, MONITOR_DEFAULTTONEAREST, MONITORINFO, MonitorFromPoint},
    },
    UI::WindowsAndMessaging::{
        EnumWindows, GWL_EXSTYLE, GetClassNameW, GetWindowLongW, GetWindowTextLengthW,
        GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible, WS_EX_TOOLWINDOW,
    },
};
use windows::core::BOOL;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScreenRect {
    pub left: i32,
    pub top: i32,
    pub width: i32,
    pub height: i32,
}

impl ScreenRect {
    fn from_win32(rect: RECT) -> Self {
        Self {
            left: rect.left,
            top: rect.top,
            width: rect.right - rect.left,
            height: rect.bottom - rect.top,
        }
    }

    pub fn right(&self) -> i32 {
        self.left + self.width
    }

    pub fn bottom(&self) -> i32 {
        self.top + self.height
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
    /// 창 핸들. JavaScript 숫자로 오가도 정밀도를 잃지 않는 범위의 값이다.
    pub hwnd: isize,
    pub title: String,
    pub bounds: ScreenRect,
}

pub struct MonitorArea {
    pub handle: HMONITOR,
    pub bounds: ScreenRect,
}

/// 화면에 보이는 창을 위에 놓인 순서대로 돌려준다. 이 앱의 창과 바탕 화면은 뺀다.
pub fn visible_windows(own_process_id: u32) -> Vec<WindowTarget> {
    let mut handles: Vec<HWND> = Vec::new();
    // EnumWindows는 위에 놓인 창부터 차례로 콜백을 부른다.
    unsafe {
        let _ = EnumWindows(
            Some(collect_handle),
            LPARAM(&mut handles as *mut _ as isize),
        );
    }
    handles
        .into_iter()
        .filter_map(|hwnd| describe_window(hwnd, own_process_id))
        .collect()
}

unsafe extern "system" fn collect_handle(hwnd: HWND, handles: LPARAM) -> BOOL {
    let handles = unsafe { &mut *(handles.0 as *mut Vec<HWND>) };
    handles.push(hwnd);
    BOOL(1)
}

fn describe_window(hwnd: HWND, own_process_id: u32) -> Option<WindowTarget> {
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() || IsIconic(hwnd).as_bool() {
            return None;
        }
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if ex_style & WS_EX_TOOLWINDOW.0 != 0 {
            return None;
        }
        let mut process_id = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        if process_id == own_process_id {
            return None;
        }
        // 가상 데스크톱이나 앱 일시 중단으로 숨겨진 창은 보이는 상태여도 그려지지 않는다.
        let mut cloaked = 0u32;
        let cloaked_size = size_of::<u32>() as u32;
        if DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut _ as *mut c_void,
            cloaked_size,
        )
        .is_ok()
            && cloaked != 0
        {
            return None;
        }
        let class = window_class(hwnd);
        if class == "Progman" || class == "WorkerW" {
            return None;
        }
        let title = window_title(hwnd);
        if title.is_empty() {
            return None;
        }
        // GetWindowRect는 보이지 않는 크기 조절 테두리까지 포함하므로 실제로 그려지는 범위를 쓴다.
        let mut rect = RECT::default();
        let rect_size = size_of::<RECT>() as u32;
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut rect as *mut _ as *mut c_void,
            rect_size,
        )
        .ok()?;
        let bounds = ScreenRect::from_win32(rect);
        if bounds.width <= 0 || bounds.height <= 0 {
            return None;
        }
        Some(WindowTarget {
            hwnd: hwnd.0 as isize,
            title,
            bounds,
        })
    }
}

fn window_title(hwnd: HWND) -> String {
    unsafe {
        let length = GetWindowTextLengthW(hwnd);
        if length <= 0 {
            return String::new();
        }
        let mut buffer = vec![0u16; length as usize + 1];
        let copied = GetWindowTextW(hwnd, &mut buffer);
        String::from_utf16_lossy(&buffer[..copied.max(0) as usize])
    }
}

fn window_class(hwnd: HWND) -> String {
    let mut buffer = [0u16; 64];
    let copied = unsafe { GetClassNameW(hwnd, &mut buffer) };
    String::from_utf16_lossy(&buffer[..copied.max(0) as usize])
}

/// 화면 좌표 한 점이 속한 모니터. 어느 모니터에도 없으면 가장 가까운 모니터를 고른다.
pub fn monitor_at(x: i32, y: i32) -> Option<MonitorArea> {
    unsafe {
        let handle = MonitorFromPoint(POINT { x, y }, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(handle, &mut info).as_bool() {
            return None;
        }
        Some(MonitorArea {
            handle,
            bounds: ScreenRect::from_win32(info.rcMonitor),
        })
    }
}

/// 창 핸들이 가리키는 창의 현재 화면 범위
pub fn window_bounds(hwnd: isize) -> Option<ScreenRect> {
    let mut rect = RECT::default();
    let rect_size = size_of::<RECT>() as u32;
    unsafe {
        DwmGetWindowAttribute(
            HWND(hwnd as *mut c_void),
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut rect as *mut _ as *mut c_void,
            rect_size,
        )
        .ok()?;
    }
    Some(ScreenRect::from_win32(rect))
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
