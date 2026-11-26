//! Finder나 파일 탐색기에서 이 앱으로 연 이미지를 편집 화면에 전달한다.

use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    AppHandle, Manager, State,
    ipc::{Channel, Response},
};

type OpenNotice = (u32, String);

#[derive(Default)]
pub struct OpenedFiles(Mutex<Inbox>);

#[derive(Default)]
struct Inbox {
    id: u32,
    path: Option<PathBuf>,
    editor: Option<Channel<OpenNotice>>,
}

impl Inbox {
    fn notify(&self) -> tauri::Result<()> {
        if let (Some(path), Some(editor)) = (&self.path, &self.editor) {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            editor.send((self.id, name.into_owned()))?;
        }
        Ok(())
    }

    fn take(&mut self, id: u32) -> Option<PathBuf> {
        if id == self.id {
            self.path.take()
        } else {
            None
        }
    }
}

pub fn open(app: &AppHandle, path: PathBuf) {
    let files = app.state::<OpenedFiles>();
    let mut inbox = files.0.lock().unwrap();
    inbox.id = inbox.id.wrapping_add(1);
    inbox.path = Some(path);
    if inbox.notify().is_err() {
        // 웹뷰가 닫혔으면 다음 등록 때까지 열기 요청을 보관한다.
        inbox.editor = None;
    }
}

/// Windows 파일 탐색기는 연 파일을 실행 인자로 넘긴다. 첫 인자는 실행 파일 자신이다.
/// 편집 창은 문서 하나를 다루므로 여러 파일을 함께 열면 첫 파일만 고른다.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn path_argument(args: impl IntoIterator<Item = OsString>, cwd: &Path) -> Option<PathBuf> {
    args.into_iter()
        .skip(1)
        .find(|arg| !arg.to_string_lossy().starts_with('-'))
        .map(|arg| cwd.join(arg))
}

#[tauri::command]
pub fn listen_opened_files(
    files: State<'_, OpenedFiles>,
    channel: Channel<OpenNotice>,
) -> Result<(), String> {
    let mut inbox = files.0.lock().unwrap();
    inbox.editor = Some(channel);
    inbox
        .notify()
        .map_err(|_| "다른 앱에서 보낸 파일 열기 요청을 받을 수 없습니다.".into())
}

#[tauri::command(async)]
pub fn read_opened_image(files: State<'_, OpenedFiles>, id: u32) -> Result<Response, String> {
    // 웹뷰는 경로를 지정할 수 없다. 운영체제가 보낸 이번 요청만 한 번 읽는다.
    let path = files
        .0
        .lock()
        .unwrap()
        .take(id)
        .ok_or("다른 파일 열기 요청이 들어왔습니다.")?;
    read_image(&path).map(Response::new)
}

fn read_image(path: &Path) -> Result<Vec<u8>, String> {
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
        return Err("PNG, JPEG, WebP, GIF 파일을 선택하세요.".into());
    }
    if !path.is_file() {
        return Err("이미지 파일의 위치와 읽기 권한을 확인하세요.".into());
    }
    fs::read(path).map_err(|_| "이미지 파일의 위치와 읽기 권한을 확인하세요.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "screen-note-{label}-test-{}",
            std::process::id()
        ));
        fs::create_dir(&dir).unwrap();
        dir
    }

    #[test]
    fn moved_and_deleted_files_report_an_error() {
        let dir = test_dir("moved");
        let first = dir.join("사진.png");
        let moved = dir.join("옮긴 사진.PNG");
        fs::write(&first, b"data").unwrap();
        fs::rename(&first, &moved).unwrap();
        assert!(read_image(&first).is_err());
        assert_eq!(read_image(&moved).unwrap(), b"data");
        fs::remove_file(&moved).unwrap();
        assert!(read_image(&moved).is_err());
        fs::remove_dir(dir).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn unreadable_file_reports_an_error_and_remains_reopenable() {
        use std::os::unix::fs::PermissionsExt;
        let dir = test_dir("unreadable");
        let path = dir.join("사진.png");
        fs::write(&path, b"data").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o000)).unwrap();
        if fs::File::open(&path).is_err() {
            assert!(read_image(&path).is_err());
        }
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
        assert_eq!(read_image(&path).unwrap(), b"data");
        fs::remove_dir_all(dir).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn locked_file_reports_an_error_and_remains_reopenable() {
        use std::os::windows::fs::OpenOptionsExt;
        let dir = test_dir("locked");
        let path = dir.join("사진.png");
        fs::write(&path, b"data").unwrap();
        // 다른 앱이 공유 없이 연 파일은 읽을 수 없다.
        let lock = fs::OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&path)
            .unwrap();
        assert!(read_image(&path).is_err());
        drop(lock);
        assert_eq!(read_image(&path).unwrap(), b"data");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn stale_open_cannot_consume_the_new_file() {
        let path = PathBuf::from("새 사진.png");
        let mut inbox = Inbox {
            id: 2,
            path: Some(path.clone()),
            editor: None,
        };
        assert!(inbox.notify().is_ok());
        assert_eq!(inbox.take(1), None);
        assert_eq!(inbox.take(2), Some(path));
        assert_eq!(inbox.take(2), None);
    }

    #[test]
    fn path_argument_skips_the_program_and_resolves_relative_paths() {
        let cwd = Path::new("work");
        let args = ["screen-note.exe", "--flag", "사진.png", "둘째.png"].map(OsString::from);
        assert_eq!(path_argument(args, cwd), Some(cwd.join("사진.png")));
        let absolute = std::env::temp_dir().join("사진.png");
        let args = [OsString::from("screen-note.exe"), absolute.clone().into()];
        assert_eq!(path_argument(args, cwd), Some(absolute));
        assert_eq!(path_argument([OsString::from("screen-note.exe")], cwd), None);
    }
}
