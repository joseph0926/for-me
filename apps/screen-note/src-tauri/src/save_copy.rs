use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::Path,
};
use tauri::{
    AppHandle, Manager,
    ipc::{InvokeBody, Request},
};

fn write_copy(directory: &Path, stem: &str, png: &[u8]) -> io::Result<String> {
    for number in 1_u32.. {
        let name = if number == 1 {
            format!("{stem}-복사본.png")
        } else {
            format!("{stem}-복사본 ({number}).png")
        };
        let path = directory.join(&name);
        let mut file = match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        };
        if let Err(error) = file.write_all(png).and_then(|_| file.sync_all()) {
            drop(file);
            fs::remove_file(&path)?;
            return Err(error);
        }
        return Ok(name);
    }
    Err(io::Error::other("새 파일 이름을 만들 수 없습니다."))
}

fn copy_parts(body: &[u8]) -> Option<(&str, &[u8])> {
    // 파일 이름과 PNG를 한 번에 받아 큰 이미지도 JSON 숫자 배열로 변환하지 않는다.
    let end = body.iter().take(181).position(|&byte| byte == 0)?;
    let stem = std::str::from_utf8(&body[..end]).ok()?;
    let png = &body[end + 1..];
    if stem.is_empty()
        || stem
            .chars()
            .any(|c| c.is_control() || r#"<>:"/\|?*"#.contains(c))
        || !png.starts_with(b"\x89PNG\r\n\x1a\n")
    {
        return None;
    }
    Some((stem, png))
}

#[tauri::command(async)]
pub fn save_copy(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(body) = request.body() else {
        return Err("이미지 데이터를 읽을 수 없습니다.".into());
    };
    let (stem, png) = copy_parts(body).ok_or("파일 이름이나 PNG 데이터가 올바르지 않습니다.")?;
    let directory = app
        .path()
        .download_dir()
        .map_err(|_| "다운로드 폴더를 찾을 수 없습니다.")?;
    write_copy(&directory, stem, png)
        .map_err(|_| "다운로드 폴더의 쓰기 권한과 남은 공간을 확인하세요.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_png_and_rejects_paths_and_invalid_payloads() {
        let png = b"\x89PNG\r\n\x1a\n";
        let payload = |name: &str| [name.as_bytes(), &[0], png].concat();
        let valid = payload("사진");
        assert_eq!(copy_parts(&valid), Some(("사진", png.as_slice())));
        for name in [
            "",
            "../escape",
            "C:\\file",
            "a:b",
            "new\nline",
            &"a".repeat(181),
        ] {
            assert!(copy_parts(&payload(name)).is_none());
        }
        assert!(copy_parts(b"note\0not a png").is_none());
        assert!(copy_parts(b"no name separator").is_none());
    }

    #[test]
    fn concurrent_saves_preserve_existing_files_and_report_write_failures() {
        let directory =
            std::env::temp_dir().join(format!("screen-note-copy-test-{}", std::process::id()));
        fs::create_dir(&directory).unwrap();
        let existing = directory.join("사진-복사본.png");
        fs::write(&existing, b"existing").unwrap();
        std::thread::scope(|scope| {
            let first = scope.spawn(|| write_copy(&directory, "사진", b"first").unwrap());
            let second = scope.spawn(|| write_copy(&directory, "사진", b"second").unwrap());
            for (job, expected) in [(first, b"first".as_slice()), (second, b"second".as_slice())] {
                assert_eq!(
                    fs::read(directory.join(job.join().unwrap())).unwrap(),
                    expected
                );
            }
        });
        assert!(directory.join("사진-복사본 (2).png").is_file());
        assert!(directory.join("사진-복사본 (3).png").is_file());
        assert_eq!(fs::read(&existing).unwrap(), b"existing");
        assert!(write_copy(&existing, "사진", b"failure").is_err());
        fs::remove_dir_all(directory).unwrap();
    }
}
