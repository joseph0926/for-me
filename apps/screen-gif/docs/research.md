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

## macOS 확장 때 확인할 것

- ScreenCaptureKit은 macOS 12.3 이상에서 쓸 수 있고, 사용자의 화면 기록 권한이 필요합니다.
- 커서 포함은 `showsCursor`, 자기 창 제외는 캡처 필터의 제외 창 목록으로 처리합니다.
- Electron 문서는 macOS의 창 공유 차단 설정(`NSWindowSharingNone`)이 ScreenCaptureKit을 쓰는 앱에는 통하지 않는다고 경고합니다. 따라서 macOS에서는 Tauri의 캡처 방지 설정에 기대지 않고, 캡처 필터에서 조작 막대 창을 직접 빼야 할 가능성이 큽니다.

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
