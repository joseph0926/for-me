fn main() {
    tauri_build::build();
    #[cfg(target_os = "macos")]
    link_swift_runtime_libraries();
}

/// `screencapturekit`이 쓰는 Swift 연결 코드를 실행 파일에 연결하는 데 필요한 설정을 더한다.
///
/// - 실행할 때 Swift 런타임(`libswift_Concurrency.dylib` 등)을 운영체제의 `/usr/lib/swift`에서 찾게 한다.
///   그 크레이트들도 같은 값을 넘기지만, 의존성 빌드 스크립트의 `rustc-link-arg`는 이 실행 파일에
///   적용되지 않아 실행하자마자 종료된다.
/// - 빌드할 때 Swift 호환 라이브러리(`libswiftCompatibility56.a` 등)를 찾게 한다. 그 크레이트들의 빌드
///   스크립트는 Xcode의 폴더 구조만 가정해 Command Line Tools만 있는 맥에서는 없는 경로를 넘기므로,
///   실제로 쓰는 `swiftc` 옆의 라이브러리 폴더를 연결 경로에 더한다.
#[cfg(target_os = "macos")]
fn link_swift_runtime_libraries() {
    use std::{path::Path, process::Command};

    println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
    println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
    let Ok(output) = Command::new("xcrun").args(["--find", "swiftc"]).output() else {
        return;
    };
    if !output.status.success() {
        return;
    }
    let swiftc = String::from_utf8_lossy(&output.stdout);
    // swiftc는 <toolchain>/usr/bin에 있고, 라이브러리는 <toolchain>/usr/lib/swift/macosx에 있다.
    let Some(usr) = Path::new(swiftc.trim()).parent().and_then(Path::parent) else {
        return;
    };
    let libraries = usr.join("lib/swift/macosx");
    if libraries.is_dir() {
        println!("cargo:rustc-link-search=native={}", libraries.display());
    }
}
