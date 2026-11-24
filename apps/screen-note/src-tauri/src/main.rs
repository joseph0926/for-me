#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod save_copy;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_copy::save_copy])
        .run(tauri::generate_context!())
        .expect("이미지 편집기를 시작할 수 없습니다");
}
