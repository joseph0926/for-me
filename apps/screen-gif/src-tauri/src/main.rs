#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! 트레이에 상주하다가 녹화할 때만 선택 오버레이, 조작 막대와 녹화 범위 테두리를 띄운다.

mod frame_queue;
mod recording;
mod targets;

use std::{path::Path, sync::Mutex, time::Duration};

use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, RunEvent, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, Wry,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

use recording::{Recording, Target};
use targets::{MonitorArea, ScreenRect, WindowId, WindowTarget};

const OVERLAY: &str = "overlay";
const TOOLBAR: &str = "toolbar";
const FRAME: &str = "frame";
/// 조작 막대의 논리 픽셀 크기. 버튼 두 개와 경과 시간이 들어간다.
const TOOLBAR_SIZE: (f64, f64) = (264.0, 68.0);
/// 녹화 대상과 조작 막대 사이의 논리 픽셀 간격
const TOOLBAR_GAP: f64 = 12.0;
/// 녹화 범위 테두리의 논리 픽셀 두께. 화면 쪽 `Frame`의 테두리 두께와 같아야 한다.
const FRAME_THICKNESS: f64 = 2.0;
/// 창을 녹화할 때 테두리가 창 위치를 다시 확인하는 간격
const FRAME_FOLLOW_INTERVAL: Duration = Duration::from_millis(100);

struct AppState {
    session: Mutex<Session>,
    tray: TrayItems,
}

#[derive(Default)]
struct Session {
    id: u64,
    phase: Phase,
}

#[derive(Default)]
enum Phase {
    #[default]
    Idle,
    Selecting,
    Recording(Recording),
    SaveFailed(String),
}

#[derive(serde::Serialize)]
struct ViewSession {
    id: u64,
    error: Option<String>,
}

impl Session {
    fn view(&self, label: &str) -> Option<ViewSession> {
        let error = match (&self.phase, label) {
            (Phase::Selecting, OVERLAY) | (Phase::Recording(_), TOOLBAR) => None,
            (Phase::SaveFailed(message), TOOLBAR) => Some(message.clone()),
            _ => return None,
        };
        Some(ViewSession { id: self.id, error })
    }
}

fn notify_session_changed(app: &AppHandle) {
    if let Err(error) = app.emit("session-changed", ()) {
        eprintln!("화면 상태를 알릴 수 없습니다: {error}");
    }
}

struct TrayItems {
    record: MenuItem<Wry>,
    stop: MenuItem<Wry>,
}

impl TrayItems {
    fn set_recording(&self, recording: bool) {
        let _ = self.record.set_enabled(!recording);
        let _ = self.stop.set_enabled(recording);
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 트레이에만 상주하므로 Dock 아이콘과 앱 메뉴를 두지 않는다. 다른 앱의 전체 화면 위에 선택
            // 오버레이를 띄우는 데도 필요하다고 알려져 있다(docs/research.md의 Tauri 창 동작 차이).
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let record = MenuItem::with_id(app, "record", "녹화", true, None::<&str>)?;
            let stop_item = MenuItem::with_id(app, "stop", "정지", false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&record, &stop_item, &quit])?;
            let mut tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("screen-gif")
                .on_menu_event(|app, event| {
                    // Windows에서는 이벤트 처리기 안에서 창을 만들면 교착 상태가 될 수 있어
                    // (Tauri WebviewWindowBuilder::new 문서의 알려진 문제) 창 작업을 별도 스레드로 넘긴다.
                    let app = app.clone();
                    let id = event.id().as_ref().to_string();
                    std::thread::spawn(move || match id.as_str() {
                        "record" => {
                            if let Err(error) = open_overlay(&app) {
                                eprintln!("선택 오버레이를 열 수 없습니다: {error}");
                            }
                        }
                        "stop" => {
                            if let Err(error) = stop(&app, None) {
                                eprintln!("녹화를 저장할 수 없습니다: {error}");
                            }
                        }
                        "quit" => {
                            cancel(&app, None);
                            app.exit(0);
                        }
                        _ => {}
                    });
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            app.manage(AppState {
                session: Mutex::new(Session::default()),
                tray: TrayItems {
                    record,
                    stop: stop_item,
                },
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            view_session,
            list_windows,
            cancel_selection,
            start_recording,
            stop_recording,
            cancel_recording,
        ])
        .build(tauri::generate_context!())
        .expect("Tauri 앱을 만들 수 없습니다")
        .run(|_app, event| {
            // 창을 모두 닫아도 트레이에 남아 있어야 한다. 종료 메뉴는 코드를 주고 끝내므로 막지 않는다.
            if let RunEvent::ExitRequested {
                api, code: None, ..
            } = event
            {
                api.prevent_exit();
            }
        });
}

// 매 녹화에서 같은 네이티브 창을 쓴다. 이전 창의 닫힘 통지와 다음 창의 생성이 겹치지 않는다.
fn recording_window(app: &AppHandle, label: &str, title: &str) -> tauri::Result<WebviewWindow> {
    let window = match app.get_webview_window(label) {
        Some(window) => window,
        None => WebviewWindowBuilder::new(
            app,
            label,
            WebviewUrl::App(format!("index.html?view={label}").into()),
        )
        .title(title)
        .decorations(false)
        .transparent(label != TOOLBAR)
        .shadow(label == TOOLBAR)
        .focused(label == OVERLAY)
        .accept_first_mouse(label == TOOLBAR)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .build()?,
    };
    window.set_content_protected(true)?;
    Ok(window)
}

fn open_overlay(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    let mut session = state.session.lock().unwrap();
    if matches!(session.phase, Phase::Recording(_)) {
        return Ok(());
    }
    let cursor = app.cursor_position()?;
    let monitor = targets::monitor_at(cursor.x as i32, cursor.y as i32)
        .ok_or_else(|| std::io::Error::other("선택 화면을 띄울 모니터가 없습니다"))?;
    let window = recording_window(app, OVERLAY, "screen-gif 선택")?;
    window.set_position(PhysicalPosition::new(
        monitor.bounds.left,
        monitor.bounds.top,
    ))?;
    window.set_size(PhysicalSize::new(
        monitor.bounds.width as u32,
        monitor.bounds.height as u32,
    ))?;
    window.show()?;
    if !matches!(session.phase, Phase::Selecting) {
        if matches!(session.phase, Phase::SaveFailed(_)) {
            hide_window(app, TOOLBAR);
        }
        session.id += 1;
        session.phase = Phase::Selecting;
    }
    notify_session_changed(app);
    window.set_focus()
}

fn open_toolbar(app: &AppHandle, anchor: ScreenRect) -> tauri::Result<()> {
    let monitor = targets::monitor_at(
        anchor.left + anchor.width / 2,
        anchor.top + anchor.height / 2,
    )
    .ok_or_else(|| std::io::Error::other("조작 막대를 띄울 모니터가 없습니다"))?;
    let scale = scale_of(app, &monitor)?;
    let width = (TOOLBAR_SIZE.0 * scale).round() as i32;
    let height = (TOOLBAR_SIZE.1 * scale).round() as i32;
    let gap = (TOOLBAR_GAP * scale).round() as i32;
    let area = monitor.bounds;

    // 녹화 대상 아래에 두고, 자리가 없으면 위에, 그래도 없으면 대상 안쪽 아래에 둔다.
    // 조작 막대는 녹화 결과에서 빠지므로 대상과 겹쳐도 GIF에는 나오지 않는다.
    let below = anchor.bottom() + gap;
    let above = anchor.top - gap - height;
    let top = if below + height <= area.bottom() {
        below
    } else if above >= area.top {
        above
    } else {
        anchor.bottom() - gap - height
    };
    let left = (anchor.left + anchor.width / 2 - width / 2).clamp(area.left, area.right() - width);

    let window = recording_window(app, TOOLBAR, "screen-gif 녹화")?;
    window.set_position(PhysicalPosition::new(left, top))?;
    window.set_size(PhysicalSize::new(width as u32, height as u32))?;
    window.show()
}

/// 녹화 범위를 알리는 테두리 창. 클릭은 아래 창으로 통과시키고, 녹화 결과에서는 빠진다.
fn open_frame(app: &AppHandle, target: ScreenRect) -> tauri::Result<()> {
    let window = recording_window(app, FRAME, "screen-gif 녹화 범위")?;
    window.set_ignore_cursor_events(true)?;
    place_frame(app, &window, target)?;
    window.show()
}

fn place_frame(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
    target: ScreenRect,
) -> tauri::Result<()> {
    let Some(monitor) = targets::monitor_at(
        target.left + target.width / 2,
        target.top + target.height / 2,
    ) else {
        return Ok(());
    };
    let thickness = (FRAME_THICKNESS * scale_of(app, &monitor)?).round() as i32;
    // 테두리를 대상 바깥에 그려 녹화되는 내용을 가리지 않는다. 모니터 밖으로 나가는 쪽은 안쪽으로 들어온다.
    let outer = ScreenRect {
        left: target.left - thickness,
        top: target.top - thickness,
        width: target.width + 2 * thickness,
        height: target.height + 2 * thickness,
    };
    let placed = outer.intersect(&monitor.bounds).unwrap_or(target);
    window.set_position(PhysicalPosition::new(placed.left, placed.top))?;
    window.set_size(PhysicalSize::new(placed.width as u32, placed.height as u32))
}

/// 녹화 중인 창이 움직이거나 크기가 바뀌면 테두리를 따라 옮긴다. 녹화가 끝나면 멈춘다.
fn follow_window(app: AppHandle, id: WindowId, recording_id: u64, mut last: ScreenRect) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(FRAME_FOLLOW_INTERVAL);
            let state = app.state::<AppState>();
            let session = state.session.lock().unwrap();
            if session.id != recording_id || !matches!(session.phase, Phase::Recording(_)) {
                break;
            }
            let Some(frame) = app.get_webview_window(FRAME) else {
                break;
            };
            if let Some(bounds) = targets::window_bounds(id)
                && bounds != last
            {
                let _ = place_frame(&app, &frame, bounds);
                last = bounds;
            }
        }
    });
}

/// 모니터의 배율. 논리 픽셀 하나가 차지하는 물리 픽셀 수
#[cfg(windows)]
fn scale_of(app: &AppHandle, monitor: &MonitorArea) -> tauri::Result<f64> {
    Ok(app
        .monitor_from_point(
            f64::from(monitor.bounds.left),
            f64::from(monitor.bounds.top),
        )?
        .map(|m| m.scale_factor())
        .unwrap_or(1.0))
}

/// 모니터의 배율. 논리 픽셀 하나가 차지하는 물리 픽셀 수
///
/// macOS의 Tauri `monitor_from_point`는 물리 픽셀이 아니라 포인트 좌표를 받아, 물리 픽셀로 찾으면
/// 모니터를 찾지 못하거나 다른 모니터가 나온다(QA-003). 모니터를 찾을 때 구한 배율을 쓴다.
#[cfg(target_os = "macos")]
fn scale_of(_app: &AppHandle, monitor: &MonitorArea) -> tauri::Result<f64> {
    Ok(targets::display_scale(monitor.id))
}

fn hide_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label)
        && let Err(error) = window.hide()
    {
        eprintln!("{label} 창을 숨길 수 없습니다: {error}");
    }
}

fn stop(app: &AppHandle, expected: Option<u64>) -> Result<String, String> {
    let state = app.state::<AppState>();
    let mut session = state.session.lock().unwrap();
    if expected.is_some_and(|id| id != session.id) {
        return Err("이미 끝난 녹화입니다".into());
    }
    let recording = match std::mem::take(&mut session.phase) {
        Phase::Recording(recording) => recording,
        other => {
            session.phase = other;
            return Err("녹화 중이 아닙니다".into());
        }
    };
    hide_window(app, FRAME);
    let result = recording.stop();
    match &result {
        Ok(path) => {
            hide_window(app, TOOLBAR);
            reveal_in_file_manager(path);
        }
        Err(error) => session.phase = Phase::SaveFailed(error.clone()),
    }
    state.tray.set_recording(false);
    notify_session_changed(app);
    result.map(|path| path.display().to_string())
}

fn cancel(app: &AppHandle, expected: Option<u64>) {
    let state = app.state::<AppState>();
    let mut session = state.session.lock().unwrap();
    if let Some(id) = expected
        && (id != session.id || session.view(TOOLBAR).is_none())
    {
        return;
    }
    if let Phase::Recording(recording) = std::mem::take(&mut session.phase) {
        recording.cancel();
    }
    hide_window(app, FRAME);
    hide_window(app, TOOLBAR);
    state.tray.set_recording(false);
    notify_session_changed(app);
}

/// 저장한 파일을 고른 상태로 파일 탐색기(macOS는 Finder)를 연다.
fn reveal_in_file_manager(path: &Path) {
    #[cfg(windows)]
    let _ = std::process::Command::new("explorer")
        .arg(format!("/select,{}", path.display()))
        .spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn();
}

#[tauri::command]
fn list_windows() -> Result<Vec<WindowTarget>, String> {
    targets::visible_windows(std::process::id())
}

#[tauri::command]
async fn view_session(window: WebviewWindow) -> Result<Option<ViewSession>, String> {
    let state = window.state::<AppState>();
    Ok(state.session.lock().unwrap().view(window.label()))
}

#[tauri::command]
async fn cancel_selection(app: AppHandle, id: u64) {
    let state = app.state::<AppState>();
    let mut session = state.session.lock().unwrap();
    if session.id == id && matches!(session.phase, Phase::Selecting) {
        hide_window(&app, OVERLAY);
        session.phase = Phase::Idle;
        notify_session_changed(&app);
    }
}

// 창을 만드는 명령은 Windows에서도 메인 스레드를 막지 않아야 한다(QA-001).
#[tauri::command]
async fn start_recording(app: AppHandle, id: u64, target: Target) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut session = state.session.lock().unwrap();
    if session.id != id || !matches!(session.phase, Phase::Selecting) {
        return Err("선택이 끝났습니다".into());
    }
    let anchor = match target {
        Target::Region { rect } => rect,
        Target::Window { id } => targets::window_bounds(id).ok_or("창을 찾을 수 없습니다")?,
    };
    let save_dir = app
        .path()
        .home_dir()
        .map_err(|e| format!("사용자 폴더를 찾을 수 없습니다: {e}"))?
        .join(".screen-gif");
    let overlay = app
        .get_webview_window(OVERLAY)
        .ok_or("선택 화면을 찾을 수 없습니다")?;
    overlay.hide().map_err(|e| e.to_string())?;
    let start = || {
        let recording = Recording::start(target, &save_dir)?;
        if let Err(error) = open_toolbar(&app, anchor) {
            recording.cancel();
            hide_window(&app, TOOLBAR);
            return Err(format!("조작 막대를 띄울 수 없습니다: {error}"));
        }
        Ok(recording)
    };
    let recording = match start() {
        Ok(recording) => recording,
        Err(error) => {
            overlay
                .show()
                .and_then(|()| overlay.set_focus())
                .map_err(|e| format!("{error}. 선택 화면을 다시 표시할 수 없습니다: {e}"))?;
            return Err(error);
        }
    };
    session.phase = Phase::Recording(recording);
    state.tray.set_recording(true);
    notify_session_changed(&app);
    match open_frame(&app, anchor) {
        Ok(()) => {
            if let Target::Window { id: window } = target {
                follow_window(app.clone(), window, id, anchor);
            }
        }
        Err(error) => eprintln!("녹화 범위 테두리를 띄울 수 없습니다: {error}"),
    }
    Ok(())
}

#[tauri::command]
async fn stop_recording(app: AppHandle, id: u64) -> Result<String, String> {
    stop(&app, Some(id))
}

#[tauri::command]
async fn cancel_recording(app: AppHandle, id: u64) {
    cancel(&app, Some(id));
}
