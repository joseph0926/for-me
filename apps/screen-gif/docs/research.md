# 화면 녹화 GIF 생성기 기술 조사

기술 선택의 근거와 조사 결과를 기록합니다. 앱의 목표와 첫 사용 흐름은 [범위](scope.md)에 있습니다.

2026-11-14에 조사했습니다. 버전과 날짜는 이날 crates.io와 각 공식 문서에서 확인한 값입니다. 실제 PC에서 동작을 확인한 항목은 아직 없습니다.

## 추천

Tauri 2로 앱을 만들고, 화면 캡처와 GIF 변환은 Rust로, 조작 막대와 자르기 화면은 웹 기술(TypeScript)로 구현하는 구성을 추천합니다. 2026-11-14에 이 추천대로 Tauri 2로 정했습니다. GIF 변환은 [`gif`와 자체 인코더](#결정-gif와-자체-인코더)로 정했습니다. 화면 설계는 [화면 설계](ui.md)에 있습니다.

- 어느 프레임워크를 고르든 화면 캡처는 운영체제 API를 직접 써야 합니다. Windows는 Windows.Graphics.Capture, macOS는 ScreenCaptureKit입니다. 두 API를 감싼 Rust 라이브러리가 모두 최근까지 유지되고 있습니다.
  - Windows: `windows-capture` 2.0.1(2026-08-08, MIT). 창과 모니터 캡처, 커서 포함 여부, 캡처 테두리 설정을 제공합니다.
  - macOS: `screencapturekit` 11.1.2(2026-11-02, MIT 또는 Apache-2.0).
- Tauri 2.12.5(2026-10-21, Apache-2.0 또는 MIT)는 트레이 아이콘, 항상 위에 뜨는 투명 창, 창 내용 캡처 방지(`set_content_protected`)를 제공합니다. 조작 막대를 띄우되 녹화 결과에서는 빼야 하는 요구와 맞습니다.
- 조작 막대와 자르기 화면을 웹 기술로 만들면 Windows와 macOS에서 같은 코드를 씁니다. 운영체제별로 나뉘는 부분은 캡처 계층으로 좁힙니다.
- GIF 변환도 같은 Rust 코드 안에서 처리합니다. 후보는 아래 [GIF 변환](#gif-변환)에 있습니다.

개발 PC 상태(2026-11-14): Rust 1.100.0(rustup 1.29.3, winget으로 설치), Node.js 24.21.0, Visual Studio Community 2022의 C++ 도구, WebView2 런타임이 있습니다.

## 요구별 Windows 구현 방법

| 요구 | 방법 | 근거 | 상태 |
|---|---|---|---|
| 선택한 창 녹화 | 창 핸들로 캡처 대상을 만듦(`CreateForWindow`) | Windows 10 1903 이상 | 창을 옮길 때 따라가는지, 가려지거나 최소화될 때의 동작은 미확인 |
| 드래그한 영역 녹화 | 해당 모니터를 캡처하고 영역만 잘라냄 | Windows.Graphics.Capture는 창과 모니터 단위로 캡처 | 화면 배율이 다른 모니터에서의 좌표 변환은 미확인 |
| 커서 포함 | `IsCursorCaptureEnabled` | Windows 10 2004 이상 | 미확인 |
| 조작 막대 제외 | 조작 막대 창에 `WDA_EXCLUDEFROMCAPTURE` 적용 | Windows 10 2004 이상에서 캡처 결과에서 창이 빠짐. Tauri의 `set_content_protected`가 Windows에서 이 값을 사용 | 미확인 |
| 노란 테두리 | 시스템이 캡처 중인 대상에 노란 테두리를 그림. `IsBorderRequired`로 끄기 | 문서상 Windows 10 빌드 20348 이상. 다른 앱이 테두리를 요구하면 표시됨 | 이 PC에서 끌 수 있는지, 테두리가 녹화 결과에 들어가는지 미확인 |
| 트레이 아이콘 | Tauri의 트레이 기능 | Tauri 2 | 미확인 |

드래그한 영역의 녹화가 모니터 캡처를 거치는 것은 구현 방식입니다. 모니터 전체를 녹화하는 기능은 첫 버전 범위에서 제외합니다.

## GIF 변환

GitHub는 이슈와 PR에 첨부하는 이미지와 GIF를 10MB까지 받습니다. 기본 모드는 이 한도 아래를 목표로 합니다.

| 후보 | 버전 | 라이선스 | 특징 |
|---|---|---|---|
| `gifski` | 1.34.0(2025-07-13) | AGPL-3.0-or-later. 상용 라이선스 별도 제공 | 고품질 GIF를 목표로 하는 인코더. Rust 라이브러리와 C API 제공 |
| `gif` | 0.14.2(2026-04-09) | MIT 또는 Apache-2.0 | GIF 읽기와 쓰기 라이브러리. 프레임마다 NeuQuant 방식으로 256색 팔레트를 만듦 |

`gifski`는 AGPL이라, 이 라이브러리를 넣은 앱을 다른 사람에게 배포하면 AGPL 조건을 따라야 합니다. 직접만 쓰는 경우와 배포하는 경우의 의무는 라이선스 원문으로 확인합니다. 이 저장소에는 라이선스 파일이 없고, 원격 저장소의 공개 여부는 확인하지 않았습니다. 이 내용은 법률 검토가 아닙니다.

FFmpeg의 팔레트 생성 방식은 이번에 조사하지 않았습니다.

### 2026-11-14 비교

같은 프레임을 두 라이브러리로 GIF로 만들어 파일 크기, 변환 시간, 원본과의 차이를 쟀습니다.

- 환경: Windows 11 Home(빌드 26300), AMD Ryzen 7 9700X, Rust 1.100.0, 릴리스 빌드
- 입력: 화면을 흉내 내 PowerShell의 System.Drawing으로 그린 960x540 프레임 60장(초당 10프레임, 6초). 코드 편집기에 글자가 입력되는 장면, 한글 설명 글자(ClearType), 그라데이션 제목 막대와 원, 채워지는 진행 막대, 움직이는 커서가 들어 있습니다.
- 화질 측정: 만든 GIF를 다시 풀어 같은 시각의 원본 프레임과 비교한 PSNR(dB)의 프레임 평균입니다. 높을수록 원본에 가깝습니다.
- `gifski`는 `quality` 값을, `gif`는 `Frame::from_rgba_speed`의 속도 값(1이 가장 느리고 정확함)을 바꿨습니다. `gif`는 프레임마다 전체 화면을 그대로 쓰는 기본 사용법입니다.
- 같은 명령을 두 번 실행해 크기와 화질은 같았고, 시간 차이는 10% 이내였습니다. 아래 시간은 첫 실행 값입니다.

| 설정 | 크기(MB) | 변환 시간(초) | 전체 | 코드 글자 | 한글 글자 | 그라데이션 원 |
|---|---|---|---|---|---|---|
| `gifski` quality 100 | 0.14 | 0.54 | 63.1 | 71.9 | 58.4 | 57.8 |
| `gifski` quality 90 | 0.13 | 0.46 | 53.9 | 70.3 | 58.2 | 44.6 |
| `gifski` quality 70 | 0.09 | 0.38 | 49.5 | 52.9 | 54.5 | 41.6 |
| `gifski` quality 50 | 0.07 | 0.37 | 44.3 | 44.1 | 54.3 | 39.7 |
| `gif` 속도 1 | 1.93 | 10.56 | 49.8 | 51.6 | 44.6 | 48.0 |
| `gif` 속도 10 | 1.92 | 1.41 | 44.5 | 46.3 | 38.2 | 45.8 |
| `gif` 속도 30 | 1.86 | 0.66 | 42.5 | 44.1 | 35.5 | 45.1 |

- 크기: 같은 장면에서 `gif`의 파일이 `gifski`보다 13배에서 28배 큽니다. `gifski`는 앞 프레임과 같은 부분을 투명 처리해 줄이는데, `gif`의 기본 사용법은 매 프레임 전체를 씁니다. `gif`로 크기를 줄이려면 바뀐 영역만 쓰는 처리를 직접 구현해야 합니다.
- 글자: `gifski` quality 90 이상이 코드와 한글 글자 영역 모두에서 `gif`의 가장 느린 설정보다 원본에 가깝습니다. 2배로 확대해 보면 모든 설정에서 글자는 읽혔습니다.
- 그라데이션: 원형 그라데이션은 `gif` 속도 1이 `gifski` quality 90보다 원본에 가깝고, `gifski` quality 100이 가장 가깝습니다.
- 시간: `gifski`가 모든 설정에서 1초 안에 끝났고, `gif` 속도 1은 10초가 걸렸습니다.

이 비교의 한계:

- 실제 화면 캡처가 아니라 그린 프레임 한 묶음입니다. 실제 녹화는 움직임과 색이 달라 크기 비율이 달라질 수 있으므로, 이 결과로 GitHub 10MB 안에 들어가는 녹화 길이를 정하지 않습니다.
- PSNR은 사람이 느끼는 화질과 일치하지 않을 수 있습니다.
- 처음 만든 프레임은 맨 윗줄이 반투명이었습니다. `gifski`는 이를 투명으로, `gif`는 불투명으로 처리해 결과가 달랐습니다. 실제 캡처는 불투명하므로 모든 픽셀을 불투명으로 바꿔 다시 측정했고, 위 표는 다시 잰 값입니다.

결과로 보면 품질 모드와 GitHub 용량 목표 모두에 `gifski`가 유리합니다. `gif`를 쓰려면 바뀐 영역만 쓰는 처리를 구현한 뒤 다시 비교해야 합니다. 선택은 AGPL 조건을 받아들일지에 달려 있습니다.

### 결정: `gif`와 자체 인코더

2026-11-14에 AGPL 조건을 피하려고 `gif`를 쓰고, 바뀐 영역만 쓰는 처리는 직접 구현하기로 했습니다. 구현은 `encoder/`의 `screen-gif-encoder`입니다.

- 첫 프레임만 전체를 쓰고, 이후에는 마지막으로 쓴 프레임과 달라진 사각형만 씁니다. 사각형 안에서 바뀌지 않은 픽셀은 투명으로 두어 앞 화면이 보이게 합니다.
- 팔레트는 바뀐 픽셀만으로 만듭니다. 색이 255개 이하면 그대로 쓰고, 넘으면 `color_quant` 2.0.0(MIT)의 NeuQuant로 255색으로 줄입니다. 남은 한 칸은 투명 색으로 예약해 불투명 색과 섞이지 않게 합니다. `gif`의 `Frame::from_rgba_speed`는 투명 픽셀도 색 줄이기에 함께 넣어서 쓰지 않았습니다.
- 같은 화면이 이어지면 앞 프레임의 표시 시간을 늘립니다. 2/100초보다 짧게 이어지는 프레임은 다음 프레임으로 대체합니다. 주요 브라우저는 이보다 짧은 표시 시간을 1/10초로 바꿔 재생해 속도가 틀어지기 때문입니다.
- 품질 모드는 NeuQuant의 표본 간격으로 나눕니다. 기본은 10, 품질 모드는 1입니다.

같은 비교 장면으로 다시 잰 값입니다. 환경과 측정 방법은 위 비교와 같고, 두 번 실행한 크기와 화질이 같았습니다.

| 설정 | 크기(MB) | 변환 시간(초) | 전체 | 코드 글자 | 한글 글자 | 그라데이션 원 |
|---|---|---|---|---|---|---|
| 자체 인코더 기본 | 0.099 | 0.08 | 45.1 | 51.6 | 36.3 | 47.5 |
| 자체 인코더 품질 | 0.097 | 0.23 | 52.5 | 54.9 | 45.5 | 48.5 |
| `gifski` quality 90 | 0.128 | 0.43 | 53.8 | 70.6 | 58.2 | 44.6 |
| `gif` 기본 사용법, 속도 1 | 1.935 | 10.15 | 49.9 | 51.7 | 44.7 | 47.9 |

- 크기는 `gif` 기본 사용법의 1/20 수준으로 줄었고, `gifski` quality 90보다도 작습니다. 변환도 가장 빠릅니다.
- 글자 화질은 `gifski`보다 낮습니다. 2배로 확대하면 모든 설정에서 글자는 읽히지만, 수치로는 코드 글자에서 약 16dB, 한글 글자에서 약 13dB 차이가 납니다.
- 이 장면에서 한글 글자는 처음부터 끝까지 바뀌지 않아, 첫 프레임의 색 줄이기 결과가 계속 보입니다. 첫 프레임에는 그라데이션과 여러 색이 함께 있어 255색으로 줄일 때 글자의 색이 밀립니다. 글자 화질을 더 높이려면 색 줄이기 방식을 바꾸는 것을 검토합니다.

## 다른 후보

| 후보 | Windows 캡처 | macOS 확장 | 판단 |
|---|---|---|---|
| Tauri 2와 Rust | `windows-capture` | `screencapturekit` | 추천 |
| C#과 WinUI 3 | Windows.Graphics.Capture를 C#에서 사용. Microsoft 문서와 WinUI 3 예제가 있음 | 화면을 다른 기술로 다시 만들어야 함 | Windows만 보면 자연스럽지만 macOS에서 다시 시작 |
| 운영체제별 네이티브(C#, Swift) | 위와 같음 | ScreenCaptureKit을 Swift로 직접 사용 | 각 운영체제에 가장 잘 맞지만 코드가 둘 |
| Electron | 창 내용 캡처 방지가 Windows에서 `WDA_EXCLUDEFROMCAPTURE`를 사용 | 공식 문서상 macOS의 캡처 방지 설정은 ScreenCaptureKit 앱에 통하지 않음 | 캡처와 GIF 변환 경로는 조사하지 않음. 브라우저 엔진을 함께 배포해 설치 파일이 큼 |
| Kotlin과 Compose Desktop | JVM에서 Windows.Graphics.Capture를 쓰는 유지되는 라이브러리를 찾지 못함 | 미조사 | 동영상 앱과 언어는 같지만 캡처를 직접 연결해야 함 |

`java.awt.Robot`으로 화면을 반복 캡처하면 초당 20프레임 정도에 그친다는 사용자 보고가 있습니다. 공식 측정값이 아니라 판단 근거로 쓰지 않았습니다.

## macOS 확장

2026-11-15에 조사했습니다. 버전과 날짜는 이날 crates.io, docs.rs와 Apple 문서에서 확인한 값입니다. 포럼과 이슈 글에서 가져온 내용은 사용자 보고라고 표시했습니다. macOS에서 빌드하거나 녹화해 본 항목은 아직 없습니다.

개발 맥 상태(2026-11-15): macOS 27.2.1(빌드 26B131), Apple 칩(arm64), Retina 내장 화면 하나(2560×1664). Node.js 24.22.1, pnpm 12.9.0이 있습니다. Xcode 없이 Command Line Tools만 있습니다. 조사할 때는 Rust가 없었고, 같은 날 Homebrew로 rustup 1.29.3을 설치했습니다.

### 캡처 라이브러리

`screencapturekit` 11.1.2(2026-11-02, MIT 또는 Apache-2.0)를 씁니다. 9.0.1(2026-08-31)부터 11.1.2까지 열 번 넘게 새 버전이 나와 관리가 활발하지만, 11.0에서 생성 함수가 `Result`를 돌려주도록 바뀌는 등 큰 변경도 잦습니다.

- 지원하는 macOS는 12.3 이상이고, 빌드에는 macOS 13 SDK 이상이 필요합니다. 최소 Rust 버전은 1.82입니다.
- Swift로 만든 연결 코드가 들어 있어 빌드할 때 Swift 컴파일러가 필요합니다. 라이브러리 문서는 Swift 연결 코드의 빌드 오류에 `xcode-select --install`을 안내합니다. 2026-11-15에 Command Line Tools만으로 빌드되는 것을 확인했습니다. 다만 그 크레이트들의 빌드 스크립트가 Xcode 경로만 가정하고 실행 파일의 Swift 런타임 검색 경로도 넘기지 못해, 앱의 `build.rs`에서 보충합니다([검증 기록](verification.md#2026-11-15-macos-첫-구현-빌드-검증)).
- macOS 버전별 기능은 기능 플래그(`macos_14_0`, `macos_15_0` 등)로 켭니다. 녹화 해상도 방식(`with_capture_resolution_type`)은 `macos_14_0`이 필요합니다.

### 요구별 macOS 구현 방법

| 요구 | 방법 | 근거 | 상태 |
|---|---|---|---|
| 선택한 창 녹화 | 창 하나만 담는 캡처 필터(`SCContentFilter::create().with_window(..)`) | Apple 문서: "지정한 창만 캡처하는 필터". 창 하나를 녹화할 때는 `sourceRect`를 보지 않고 창 전체를 캡처 | 창을 옮기거나 다른 모니터로 옮길 때 따라가는지는 문서에 없어 미확인 |
| 드래그한 영역 녹화 | 모니터 캡처 필터에 `with_source_rect`로 영역 지정 | Apple 문서: `sourceRect`를 정하지 않으면 화면 전체를 캡처 | `sourceRect`의 단위(포인트와 픽셀)와 원점이 문서에 없어 미확인 |
| 커서 포함 | `with_shows_cursor(true)` | docs.rs의 `SCStreamConfiguration` | 미확인 |
| 녹화 간격 | `with_minimum_frame_interval`(`CMTime`), 편의 함수 `with_fps` | docs.rs의 `SCStreamConfiguration` | 미확인 |
| 조작 막대 제외 | 모니터 캡처 필터의 제외 창 목록(`with_excluding_windows`)에 이 앱의 창을 넣음 | 아래 [창 내용 캡처 방지](#창-내용-캡처-방지) | 미확인 |
| 창 목록 | `SCShareableContent::get()`의 `windows()`. 창마다 `window_id`(u32), `title`, `frame`, `window_layer`, `is_on_screen` | docs.rs의 `SCWindow` | `frame`의 단위와 원점이 문서에 없어 미확인 |
| 트레이 아이콘 | Tauri의 트레이 기능. macOS에서는 메뉴 막대에 놓임 | Tauri 2 | 메뉴 막대용 단색 아이콘은 미정 |

프레임은 BGRA로 받습니다(`with_pixel_format(PixelFormat::BGRA)`). 인코더는 RGBA를 받으므로 색 순서를 바꾸고, 줄마다 붙는 여분 바이트(`bytes_per_row`)를 빼야 합니다. 받은 픽셀 버퍼는 잠근 뒤(`CVPixelBufferLockGuard`) 읽습니다.

Windows 코드는 모든 화면 좌표를 물리 픽셀로 다룹니다. macOS의 화면 좌표는 포인트이고, 이 맥의 배율은 2입니다. 좌표 변환이 틀리면 영역이 두 배로 어긋나므로, 드래그 영역과 녹화 결과가 맞는지를 실제 녹화로 확인합니다.

### 창 내용 캡처 방지

Tauri의 `set_content_protected`는 macOS에서 창 공유 차단 설정(`NSWindowSharingNone`)을 씁니다(tao 0.34.5의 macOS 구현). Apple의 현재 문서는 이 값을 더 이상 쓰지 않는 옛 값으로 설명하고, 캡처에서 창을 숨기는 용도로 쓰지 말라고 적고 있습니다. Electron 문서도 이 설정이 ScreenCaptureKit을 쓰는 앱에 통하지 않는다고 경고합니다. Apple 개발자 포럼에도 macOS 15.4 이후 이 설정을 한 창이 ScreenCaptureKit 캡처에 그대로 나온다는 보고(2025-07)가 있습니다.

따라서 macOS에서는 캡처 방지 설정에 기대지 않고 캡처 필터에서 이 앱의 창을 뺍니다. 녹화 범위 테두리와 선택 오버레이도 같은 방법으로 뺍니다.

### Tauri 창 동작 차이

- `skip_taskbar`는 macOS에서 아무 동작도 하지 않습니다(`tauri-runtime-wry` 소스). Dock 아이콘을 숨기려면 활성화 정책을 Accessory로 바꿉니다(`set_activation_policy`).
- 다른 앱의 전체 화면 위에 창을 띄우려면 Accessory 정책이 필요하다는 포럼 답변이 있습니다. 공식 문서가 아니므로 전체 화면 Space에서 직접 확인합니다. `visible_on_all_workspaces`도 함께 확인합니다.
- 투명 창(선택 오버레이와 녹화 범위 테두리)에는 Tauri의 `macOSPrivateApi` 설정이 필요합니다. 이 설정을 켜면 App Store에 낼 수 없습니다.
- 저장한 파일을 보여 주는 명령은 `open -R <파일>`입니다.

### 권한과 서명

- 화면 기록 권한이 없으면 `SCShareableContent::get()`이 빈 결과나 오류를 돌려줍니다. 권한 요청, 거절과 취소 때의 안내를 새로 설계해야 합니다.
- 앱 정보(Info.plist)에 화면 기록 사용 이유(`NSScreenCaptureUsageDescription`)를 넣습니다. 빠지면 공증한 앱이 죽는다고 라이브러리 문서에 적혀 있습니다.
- macOS 권한 시스템(TCC)은 코드 서명으로 새 빌드가 같은 앱인지 판단합니다. Apple 기술 지원 엔지니어는 서명이 고정되면 빌드가 바뀌어도 권한이 유지된다고 답했습니다. 임시 서명(ad-hoc)에서는 권한이 잘 유지되지 않고, macOS 15에서 임시 서명 앱의 ScreenCaptureKit 접근이 거절됐다는 보고도 있습니다. 업데이트 후 권한을 보존하려면 Apple Development 같은 고정 인증서로 서명해야 할 가능성이 큽니다.
- 터미널에서 띄운 프로그램의 권한은 그 터미널 앱에 붙습니다(권한을 책임지는 프로세스 기준). `pnpm tauri dev`로 확인한 권한 동작은 묶음 앱의 동작과 다를 수 있습니다.
- macOS 15 Sequoia는 ScreenCaptureKit을 쓰는 앱에 한 달마다 권한을 다시 물었습니다(2024-08 보도). macOS 26 이후에도 그런지는 찾지 못했습니다. Apple의 창 선택 화면(`SCContentSharingPicker`, macOS 14 이상)을 쓰면 이 질문이 없다는 사용자 의견이 있지만, 드래그로 영역을 그리는 지금 설계와 맞지 않습니다. 질문을 없애는 권한(`com.apple.developer.persistent-content-capture`)은 원격 접속 앱용이고 Apple에 따로 신청해야 합니다.

### 바꿀 코드

| 위치 | 지금 | macOS에서 |
|---|---|---|
| `src-tauri/Cargo.toml` | `windows`, `windows-capture`를 운영체제 구분 없이 사용 | Windows 전용 의존성으로 나누고 macOS에 `screencapturekit` 추가 |
| `src-tauri/src/recording.rs` | Windows.Graphics.Capture로 녹화. 파일 이름 시각은 `GetLocalTime` | ScreenCaptureKit으로 녹화. 시각은 운영체제마다 다른 방법이 필요 |
| `src-tauri/src/targets.rs` | Win32로 창 목록, 창 범위, 모니터를 찾음. 창 식별자는 `hwnd` | 창 목록과 범위는 `SCShareableContent`, 창 식별자는 창 번호(u32) |
| `src-tauri/src/main.rs` | 저장 뒤 `explorer /select` | `open -R` |

프레임 큐, 정지와 취소 흐름, 파일 이름 정하기, `.part` 파일 처리와 인코더는 운영체제와 무관합니다. 웹 화면은 창 식별자 이름(`hwnd`)만 바꾸면 그대로 씁니다.

### macOS에서 직접 확인할 항목

- `sourceRect`와 `SCWindow::frame`의 단위와 원점, Retina 배율에서 드래그 영역과 녹화 결과가 맞는지
- 배율이 다른 외부 모니터를 붙였을 때의 좌표. 이 맥은 화면이 하나라 외부 모니터가 있어야 확인할 수 있습니다.
- 캡처 필터에서 뺀 조작 막대, 오버레이와 테두리가 녹화 결과에 나오지 않는지. 녹화 범위 안에 겹쳐 놓은 상태에서 확인합니다. 범위 밖에 있던 창이 나오지 않은 결과는 제외가 된다는 근거가 아닙니다.
- 선택한 창을 옮기거나, 다른 창에 가리거나, 최소화할 때 녹화 결과
- 화면 기록 권한의 요청, 거절, 취소와 다시 빌드한 뒤 권한 유지
- 다른 앱의 전체 화면 Space와 여러 Space에서 오버레이와 조작 막대가 뜨는지

## 직접 확인할 항목

첫 시제품에서 이 PC(Windows 11)로 확인합니다.

- 선택한 창을 옮기거나, 다른 창에 가리거나, 최소화할 때 녹화 결과
- 노란 테두리를 끌 수 있는지와 녹화 결과에 테두리가 들어가는지
- 조작 막대가 녹화 결과에서 빠지는지
- 화면 배율과 모니터 구성에 따른 드래그 영역 좌표
- 기본 모드 GIF의 크기가 10MB 아래인지와 품질 모드 GIF의 글자 선명도
- 긴 녹화에서 메모리 사용량과 변환 시간

## 출처

- [GraphicsCaptureSession.IsCursorCaptureEnabled](https://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.graphicscapturesession.iscursorcaptureenabled?view=winrt-26100)
- [GraphicsCaptureSession.IsBorderRequired](https://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.graphicscapturesession.isborderrequired)
- [IGraphicsCaptureItemInterop::CreateForWindow](https://learn.microsoft.com/en-us/windows/win32/api/windows.graphics.capture.interop/nf-windows-graphics-capture-interop-igraphicscaptureiteminterop-createforwindow)
- [Screen capture - Windows apps](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture)
- [SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
- [GitHub: Attaching files](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)
- [windows-capture (crates.io)](https://crates.io/crates/windows-capture), [Settings 문서](https://docs.rs/windows-capture/2.0.1/windows_capture/settings/struct.Settings.html)
- [screencapturekit (crates.io)](https://crates.io/crates/screencapturekit)
- [scap](https://github.com/helmerapp/scap): Windows와 macOS를 함께 지원하는 캡처 라이브러리. 최신 안정 버전이 0.0.8이고 베타 0.1.0-beta.1(2025-08-04) 이후 새 버전이 없어 후보에서 뺐습니다.
- [tauri (crates.io)](https://crates.io/crates/tauri), [Window 문서](https://docs.rs/tauri/2.12.5/tauri/window/struct.Window.html), [tao의 Windows 구현](https://github.com/tauri-apps/tao/blob/dev/src/platform_impl/windows/window.rs)
- [gifski](https://github.com/ImageOptim/gifski), [gifski (crates.io)](https://crates.io/crates/gifski)
- [gif (crates.io)](https://crates.io/crates/gif), [Frame 문서](https://docs.rs/gif/0.14.2/gif/struct.Frame.html)
- [color_quant NeuQuant 문서](https://docs.rs/color_quant/2.0.0/color_quant/struct.NeuQuant.html)
- [Electron BrowserWindow: setContentProtection](https://www.electronjs.org/docs/latest/api/browser-window)
- [WgcSharp](https://www.nuget.org/packages/WgcSharp): C#에서 Windows.Graphics.Capture를 직접 쓸 때의 상호 운용 부담 설명
- [Kotlin Slack: Compose Desktop 화면 녹화](https://slack-chats.kotlinlang.org/t/16380068/have-anyone-tried-ffmpeg-screen-recording-with-desktop-i-was)
- [WWDC22: Meet ScreenCaptureKit](https://developer.apple.com/videos/play/wwdc2022/10155/)

macOS 확장(2026-11-15 확인):

- [screencapturekit-rs](https://github.com/doom-fish/screencapturekit-rs), [SCStreamConfiguration 문서](https://docs.rs/screencapturekit/11.1.2/screencapturekit/stream/configuration/struct.SCStreamConfiguration.html), [SCWindow 문서](https://docs.rs/screencapturekit/11.1.2/screencapturekit/shareable_content/window/struct.SCWindow.html), [SCContentFilter 문서](https://docs.rs/screencapturekit/11.1.2/screencapturekit/stream/content_filter/struct.SCContentFilter.html)
- [Apple: SCStreamConfiguration.sourceRect](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/sourcerect), [Apple: SCContentFilter init(desktopIndependentWindow:)](https://developer.apple.com/documentation/screencapturekit/sccontentfilter/init(desktopindependentwindow:))
- [Apple: NSWindow.SharingType.none](https://developer.apple.com/documentation/appkit/nswindow/sharingtype-swift.enum/none), [tao의 macOS 구현](https://github.com/tauri-apps/tao/blob/tao-v0.34.5/src/platform_impl/macos/window.rs)
- [Apple 개발자 포럼: macOS 15.4 이후 SharingNone 창이 ScreenCaptureKit에 캡처됨](https://developer.apple.com/forums/thread/792152)
- [tauri-runtime-wry 소스](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-runtime-wry/src/lib.rs): macOS의 `skip_taskbar`와 활성화 정책
- [Tauri: Window Customization](https://v2.tauri.app/learn/window-customization/), [Apple 개발자 포럼: 전체 화면 위에 뜨는 창](https://origin-devforums.apple.com/forums/thread/826308)
- [Apple 개발자 포럼: 코드 서명과 화면 기록 권한](https://developer.apple.com/forums/thread/695689), [Cap 이슈 #1722: 임시 서명 앱의 ScreenCaptureKit 거절](https://github.com/CapSoftware/Cap/issues/1722), [Qt: 권한을 책임지는 프로세스](https://www.qt.io/blog/the-curious-case-of-the-responsible-process)
- [TidBITS: Sequoia의 한 달 주기 권한 질문](https://tidbits.com/2024/08/19/apple-reduces-excessive-sequoia-permission-requests-shifts-to-monthly), [Apple 개발자 포럼: persistent-content-capture 권한](https://developer.apple.com/forums/thread/761641)
