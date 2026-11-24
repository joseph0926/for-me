#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
mod finder;
mod save_copy;

fn main() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "macos")]
    let builder = builder
        .manage(finder::FinderImages::default())
        .invoke_handler(tauri::generate_handler![
            save_copy::save_copy,
            finder::listen_finder,
            finder::read_finder_image
        ]);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![save_copy::save_copy]);
    builder
        .build(tauri::generate_context!())
        .expect("이미지 편집기를 시작할 수 없습니다")
        .run(|_app, _event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = _event {
                finder::opened(_app, &urls);
            }
        });
}
