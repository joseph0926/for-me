use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    AppHandle, Manager, State, Url,
    ipc::{Channel, Response},
};

type OpenNotice = (u32, String);

#[derive(Default)]
pub struct FinderImages(Mutex<Inbox>);

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

pub fn opened(app: &AppHandle, urls: &[Url]) {
    // 편집 창은 문서 하나를 다룬다. 여러 파일을 함께 놓았을 때처럼 첫 파일을 고른다.
    let Some(path) = urls.iter().find_map(|url| url.to_file_path().ok()) else {
        return;
    };
    let images = app.state::<FinderImages>();
    let mut inbox = images.0.lock().unwrap();
    inbox.id = inbox.id.wrapping_add(1);
    inbox.path = Some(path);
    if inbox.notify().is_err() {
        // 웹뷰가 닫혔으면 다음 등록 때까지 열기 요청을 보관한다.
        inbox.editor = None;
    }
}

#[tauri::command]
pub fn listen_finder(
    images: State<'_, FinderImages>,
    channel: Channel<OpenNotice>,
) -> Result<(), String> {
    let mut inbox = images.0.lock().unwrap();
    inbox.editor = Some(channel);
    inbox
        .notify()
        .map_err(|_| "Finder의 파일 열기 요청을 받을 수 없습니다.".into())
}

#[tauri::command(async)]
pub fn read_finder_image(images: State<'_, FinderImages>, id: u32) -> Result<Response, String> {
    // 웹뷰는 경로를 지정할 수 없다. 운영체제가 보낸 이번 요청만 한 번 읽는다.
    let path = images
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

    #[test]
    fn moved_and_unreadable_files_report_an_error_and_remain_reopenable() {
        use std::os::unix::fs::PermissionsExt;
        let dir =
            std::env::temp_dir().join(format!("screen-note-finder-test-{}", std::process::id()));
        fs::create_dir(&dir).unwrap();
        let first = dir.join("사진.png");
        let moved = dir.join("옮긴 사진.PNG");
        fs::write(&first, b"data").unwrap();
        fs::rename(&first, &moved).unwrap();
        assert!(read_image(&first).is_err());
        fs::set_permissions(&moved, fs::Permissions::from_mode(0o000)).unwrap();
        if fs::File::open(&moved).is_err() {
            assert!(read_image(&moved).is_err());
        }
        fs::set_permissions(&moved, fs::Permissions::from_mode(0o600)).unwrap();
        assert_eq!(read_image(&moved).unwrap(), b"data");
        fs::remove_file(&moved).unwrap();
        assert!(read_image(&moved).is_err());
        fs::remove_dir(dir).unwrap();
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
}
