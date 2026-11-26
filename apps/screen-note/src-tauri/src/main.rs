#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod opened_file;
mod save_copy;

fn main() {
    let builder = tauri::Builder::default();
    // Windows는 이미 실행 중일 때 연 파일도 새 프로세스로 보낸다. 새 프로세스를 닫고 기존 창에서 연다.
    // 이 플러그인은 다른 플러그인보다 먼저 등록해야 한다.
    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        let args = args.into_iter().map(Into::into);
        if let Some(path) = opened_file::path_argument(args, std::path::Path::new(&cwd)) {
            opened_file::open(app, path);
        }
    }));
    builder
        .manage(opened_file::OpenedFiles::default())
        .invoke_handler(tauri::generate_handler![
            save_copy::save_copy,
            opened_file::listen_opened_files,
            opened_file::read_opened_image
        ])
        .setup(|_app| {
            #[cfg(windows)]
            if let Ok(cwd) = std::env::current_dir() {
                if let Some(path) = opened_file::path_argument(std::env::args_os(), &cwd) {
                    opened_file::open(_app.handle(), path);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("이미지 편집기를 시작할 수 없습니다")
        .run(|_app, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = _event {
                // 편집 창은 문서 하나를 다룬다. 여러 파일을 함께 놓았을 때처럼 첫 파일을 고른다.
                if let Some(path) = urls.iter().find_map(|url| url.to_file_path().ok()) {
                    opened_file::open(_app, path);
                }
            }
        });
}
