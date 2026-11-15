# 화면 녹화 GIF 생성기

화면의 일부를 녹화해 GIF 파일로 만드는 데스크톱 앱입니다. Windows부터 개발하고, 이후 macOS로 확장합니다.

공통 개발 절차는 [개발 절차](../../docs/development.md), 조작과 증거 수집 방법은 [QA 절차](../../docs/qa.md)를 따릅니다.

## 현재 상태

개발 중인 Windows 시제품입니다. 2026-11-14에 드래그한 영역의 녹화와 저장을 개발 빌드로 확인하고 1차 완료했습니다. 확인한 범위와 남은 확인은 [검증 기록](docs/verification.md)에 있습니다.

- 앱은 Tauri 2, GIF 변환은 `gif` 크레이트와 직접 만든 인코더로 정했습니다.
- 트레이 메뉴, 선택 오버레이(드래그한 영역 또는 누른 창), 조작 막대(정지, 취소), GIF 저장과 폴더 열기를 구현했습니다.
- 자르기 창과 품질 모드 선택은 아직 없습니다. 지금은 정지하면 기본 모드로 바로 저장합니다.
- 녹화하는 동안 녹화 범위를 테두리로 보여 주고, 테두리는 GIF에 나오지 않게 했습니다.
- 저장 폴더는 `~/.screen-gif`(Windows는 `C:\Users\<사용자>\.screen-gif`)입니다. 2026-11-14 이전 시제품은 `사진\screen-gif`에 저장했습니다.
- macOS 버전은 2026-11-15에 ScreenCaptureKit으로 같은 흐름을 구현하고 개발 빌드가 실행되는 것까지 확인했습니다. 실제 녹화는 아직 확인하지 않았습니다.

## 문서

- [범위](docs/scope.md): 만들 기능과 완료 기준
- [기술 조사](docs/research.md): 후보 비교와 기술 결정
- [화면 설계](docs/ui.md): 화면 흐름, 화면 값과 움직임
- [검증 기록](docs/verification.md): 실행한 검사와 결과
- [QA 이슈](docs/qa-issues.md): 발견한 문제의 상태와 다음 조치

QA 문서는 실제 녹화를 확인하는 단계에서 만듭니다.

## 개발 환경

- Rust 1.100.0: `rust-toolchain.toml`이 고정하며, rustup이 없으면 자동으로 받습니다.
- Node.js와 pnpm: `package.json`의 `packageManager`가 pnpm 버전을 정합니다.
- Windows: Visual Studio의 C++ 빌드 도구와 WebView2 런타임
- macOS: 12.3 이상과 Command Line Tools(`xcode-select --install`). 화면 캡처 크레이트가 Swift 코드를 함께 빌드합니다. Homebrew의 `rustup`은 PATH에 걸리지 않으므로 `/opt/homebrew/opt/rustup/bin`을 PATH에 더해 씁니다.

이 폴더(`apps/screen-gif`)가 Cargo 작업 공간과 pnpm 프로젝트의 기준 폴더입니다.

| 폴더 | 내용 |
|---|---|
| `encoder/` | 녹화한 프레임을 GIF로 저장하는 라이브러리(`screen-gif-encoder`) |
| `src-tauri/` | Tauri 앱. 트레이, 창 관리, 화면 캡처와 저장. 운영체제별 코드는 `targets/`와 `recording/` 아래 `win32.rs`(`windows-capture`)와 `macos.rs`(`screencapturekit`) |
| `src/` | 선택 오버레이와 조작 막대 화면(React) |

## 실행

`apps/screen-gif` 폴더에서 실행합니다.

```bash
pnpm install
pnpm tauri dev
```

트레이 아이콘(macOS는 메뉴 막대)의 메뉴에서 녹화를 고르면 선택 오버레이가 뜹니다. 드래그하면 영역을, 창을 누르면 그 창을 녹화합니다. Esc는 선택을 취소합니다.

macOS에서는 처음 녹화할 때 화면 기록 권한을 요청합니다. `pnpm tauri dev`처럼 터미널에서 실행하면 권한은 그 터미널 앱에 붙습니다. 시스템 설정의 개인정보 보호 및 보안 > 화면 및 시스템 오디오 녹음에서 허용한 뒤 터미널과 앱을 다시 실행합니다.

설치 파일 없이 실행 파일만 만들려면 다음을 씁니다. 결과는 `target/debug/screen-gif.exe`(macOS는 `target/debug/screen-gif`)입니다.

```bash
pnpm tauri build --debug --no-bundle
```

## 자동 검사

`apps/screen-gif` 폴더에서 실행합니다.

```bash
pnpm typecheck
cargo test --workspace
cargo clippy --workspace --all-targets
cargo fmt --check
```
