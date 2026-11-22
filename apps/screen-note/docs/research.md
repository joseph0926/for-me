# 조사

조사일: 2026-11-22. 조사한 머신: macOS 27.2.1, arm64. Windows 머신에서는 아무것도 실행하지 않았습니다.

사용자가 바란 두 가지를 기준으로 봤습니다.

1. 캡처 직후 바로 그리기
2. 그리기 도구가 많을 것

사용자는 macOS와 Windows의 기본 기능을 잘 몰라서 생긴 요구일 수 있다고 했습니다. 그래서 기본 기능부터 조사했습니다. 이 문서의 기능 목록은 공식 문서와 기사를 읽고 정리한 것입니다. 실제로 써 본 도구는 없습니다.

## 결론

- 두 운영체제의 기본 도구에는 펜, 도형, 글자가 있습니다. 영역 모자이크나 흐림, 단계 번호, 캡처 직후 편집기 자동 열기는 공식 문서와 기사에서 찾지 못했습니다. 직접 써 보며 확인한 결과는 아닙니다.
- 비교 기준은 운영체제 기본 도구입니다(2026-11-22 사용자 결정). 위의 차이가 이 앱이 채울 부분입니다.
- Shottr, Flameshot, ShareX 같은 기존 앱은 비교 기준이 아니라, 어떤 도구를 넣을지 고를 때 참고하는 자료로 둡니다.
- 만든다면 Tauri 2, React, Konva로 별도 앱을 만들고 [화면 녹화 GIF 생성기](../../screen-gif/README.md)에서 화면 캡처, 권한, 화면 배율 처리 코드를 가져오는 방향이 유력합니다. 자세한 근거는 [구현 기술](#구현-기술) 절에 있습니다.

## macOS 기본 도구(macOS 27)

- **단축키:** `⌘⇧3`은 화면 전체, `⌘⇧4`는 영역(이어서 Space를 누르면 창), `⌘⇧5`는 캡처 막대를 엽니다. Control을 함께 누르면 파일 대신 클립보드로 보냅니다.
- **편집기 열기:** 자동으로 열리지 않습니다. 화면 구석에 뜨는 미리보기를 눌러야 마크업 창이 열리고, 누르지 않으면 그대로 저장됩니다.
- **저장 위치:** 기본은 데스크톱이고 `⌘⇧5`의 옵션에서 바꿉니다.
- **마크업 도구(Apple 문서):**
  - 스케치(손으로 그린 모양을 도형으로 바꿈), 그리기
  - 도형 안의 돋보기와 강조(나머지를 어둡게)
  - 글자, 서명, 회전, 자르기
- **화살표와 말풍선:** Apple 문서에는 이름이 없습니다. 도형 목록에 있다는 설명은 제3자 기사에만 있습니다.
- **찾지 못한 기능:** 영역 흐림, 모자이크, 단계 번호. Apple 문서와 제3자 기사에서 찾지 못했다는 뜻이고, 직접 써 보며 확인하지는 않았습니다.
- **되돌리기:** Apple 문서에는 모든 변경을 취소하는 기능만 나옵니다. `⌘Z` 지원은 확인하지 못했습니다.
- **macOS 27에서 바뀐 점:** 스크린샷을 찍으면 실행되는 단축어 자동화가 생겼다는 기사가 있습니다. 마크업 자체가 바뀌었다는 기사는 찾지 못했습니다.

## Windows 11 기본 도구(캡처 도구)

- **단축키:** `Win+Shift+S`는 이미지, `Win+Shift+R`은 화면 녹화입니다.
- **편집기 열기:** 기본은 캡처 뒤 알림을 눌러야 열립니다. 자동으로 여는 공식 설정은 찾지 못했습니다.
- **편집 도구(Microsoft 지원 문서):**
  - 펜, 형광펜, 지우개
  - 도형과 이모지, 자르기
  - 실행 취소와 다시 실행
  - 그리다 멈추면 직선, 화살표, 도형으로 반듯하게 바꾸기
- **글자 도구:** 2025-11 Insider 대상 기사만 있습니다. 정식 배포는 확인하지 못했습니다.
- **Quick markup(2025-09 Insider, 11.2508.24.0):** 영역을 고른 상태에서 캡처를 확정하기 전에 `Ctrl+E`로 펜, 형광펜, 도형과 이모지를 쓸 수 있습니다. 캡처 직후 그리기에 가장 가까운 기본 기능입니다. 사용자 PC에 이 기능이 있는지는 확인하지 않았습니다.
- **가리기:** 기기 안에서 글자를 인식해 이메일과 전화번호를 자동으로 가리는 기능(Quick redact)이 있습니다. 직접 영역을 골라 흐리게 하거나 모자이크하는 도구는 없습니다.

## 기존 앱(기능 참고)

어떤 도구를 넣을지 고를 때 참고합니다. GitHub 별 수와 릴리스는 2026-11-22 조회값입니다.

| 도구 | 운영체제, 가격 | 캡처 직후 편집기 | 기본 도구에 없는 기능 |
|---|---|---|---|
| Shottr | macOS. 무료로 계속 쓸 수 있고 가끔 구매를 권함. v1.10(2026-11) | 처음 영역 캡처 때 편집기와 미리보기 중 고르고 설정에서 바꿈 | 모자이크, 단계 번호, 스포트라이트, 휘는 화살표, 배경 넣기, 글자 인식, 화면에 고정, 스크롤 캡처 |
| CleanShot X | macOS. 한 번 결제 $35(업데이트 1년), 구독형 Pro | 구석에 뜨는 막대에서 편집 선택. 자동 열기 설정은 확인 못 함 | 흐림, 모자이크, 번호, 스포트라이트, 배경, 글자 인식, 고정, 스크롤 캡처, 녹화 |
| Snagit | Windows, macOS. 연간 구독 | 확인 못 함 | 단계 번호, 말풍선, 확대, 자동 가리기, 글자 인식, 스크롤 캡처, 템플릿 |
| ShareX | Windows. GPL-3.0, 무료, 광고 없음. 별 약 41k, v22.4.0(2026-11) | 캡처 후 할 일에 편집기 열기를 넣을 수 있음 | 흐림, 모자이크, 단계 번호, 스포트라이트, 확대, 말풍선, 글자 인식, 고정, 스크롤 캡처, 업로드 |
| Flameshot | Windows, macOS, Linux. GPL-3.0, 무료. 별 약 32k, v15.0.0(2026-11) | 영역을 고른 그 자리에서 바로 그림 | 모자이크, 증가하는 번호, 화살표, 형광펜, 실행 취소, 고정 |
| Greenshot | Windows 무료(GPL-3.0), macOS는 유료. 별 약 5k | 캡처 뒤 메뉴에서 편집기 선택, 기본값으로 지정 가능 | 픽셀화, 흐림, 영역 강조, 확대 |
| Ksnip | Windows, macOS, Linux. GPL-3.0. 마지막 정식 릴리스 2023-03 | 확인 못 함 | 흐림, 모자이크, 스티커, 고정 |

## 구현 기술

### 화면 한 장 캡처

**macOS**

- `ScreenCaptureKit`의 `SCScreenshotManager`를 씁니다. macOS 14 이상이 필요합니다.
- Rust 크레이트 `screencapturekit` 12.0.0(2026-11-21)은 기능 플래그로 나뉩니다.
  - 화면 전체 한 장: macOS 14
  - 영역 지정(포인트 단위): macOS 15.2
  - HDR과 파일 저장: macOS 26
- 화면 녹화 GIF 생성기는 11.1.2를 고정해 씁니다. 12.0에서 바뀐 점은 확인하지 못했습니다.
- 캡처 크기를 포인트로 주면 결과가 흐려진다는 개발자 포럼 보고가 있습니다. 설정에는 픽셀 크기를 넣습니다.
- macOS 14 이상의 시스템 선택기(`SCContentSharingPicker`)를 쓰면 사용자가 고른 창, 앱이나 화면에만 그 세션 동안 접근합니다. Apple은 이 경로에 전체 화면 기록 권한 승인이 필요 없다고 설명합니다. 다만 영역을 드래그해 고르는 모드는 확인되지 않아, 영역 캡처에는 직접 조회 경로와 화면 기록 권한이 필요할 가능성이 큽니다. 근거는 위키의 화면 캡처 권한과 대상 선택 페이지(2026-11-15 macOS 조사)입니다.
- 옛 API인 `CGWindowListCreateImage`는 쓰지 않습니다.
  - macOS 14에서 지원 중단이 예고됐습니다.
  - macOS 27에서는 회색 이미지를 돌려준다는 개발자 포럼 보고가 있고, Apple 답변자도 우회 방법이 없다고 했습니다.
  - Rust의 `xcap` 0.9.10은 macOS에서 이 함수를 쓰므로 이 Mac에서는 실패할 가능성이 큽니다. 실제로 실행해 보지는 않았습니다.

**Windows**

- Windows.Graphics.Capture에는 한 장만 찍는 API가 없습니다. 연속 캡처를 시작해 첫 프레임을 받고 멈춥니다.
- `windows-capture` 2.0.1은 이 방식과 DXGI Desktop Duplication을 모두 제공합니다.
- 첫 프레임이 오기까지의 지연과 캡처 중 노란 테두리 표시는 확인하지 못했습니다.

### 그리기 캔버스

| 후보 | 버전(날짜) | 라이선스 | 압축 크기 | 판단 |
|---|---|---|---|---|
| Konva와 react-konva | 10.10.0(2026-11), 19.3.2 | MIT | 약 57KB | 추천. 그린 도형을 골라 옮기고 크기를 바꾸는 기능이 있고 React state와 잘 맞음. 글자 편집과 되돌리기는 직접 만들어야 함 |
| Fabric.js | 7.4.0(2026-05) | MIT | 약 92KB | 글자 편집과 픽셀화, 흐림 필터가 내장됨. 명령형 API라 React와 잇는 코드가 늘어남 |
| Excalidraw | 0.18.1(2026-04) | MIT | 약 353KB | 손그림 느낌의 화이트보드라 모자이크가 없음. 원본 해상도 내보내기는 확인 못 함 |
| tldraw | 5.6.2(2026-11) | 자체 라이선스 | 약 555KB | 배포판에 라이선스 키가 필요하고 무료 키는 워터마크를 지울 수 없음. 제외 |

- 원본 해상도 PNG는 Konva의 `toDataURL`에 `pixelRatio`를 넣어 냅니다. Retina 화면에서 실제로 원본 픽셀 크기가 나오는지는 시제품에서 확인해야 합니다.
- 모자이크는 라이브러리 필터에 맡기지 않고 원본 픽셀을 블록 단위로 평균 내어 이미지에 직접 굽는 방식이 결과를 통제하기 쉽습니다.
- 흐림은 원래 글자를 되살리기 쉬우므로 개인정보 가리기의 기본 도구는 모자이크나 채운 사각형으로 둡니다.

### Swift로 직접 만드는 경우와 비교

**Swift의 장점**

- 웹 화면을 띄우는 시간이 없어 편집기가 빨리 열릴 수 있습니다.
- 캡처한 이미지를 앱 안에서 그대로 씁니다. 웹 화면으로 넘기는 복사가 없습니다.

**Swift의 단점**

- macOS의 PencilKit 그리기 화면은 일반 macOS 앱에서는 쓸 수 없고 Mac Catalyst에서만 됩니다. 도형 도구도 없어 결국 직접 그려야 합니다.
- Windows는 처음부터 다시 만들어야 합니다.

**Tauri에서 편집기를 빨리 여는 방법**

- 편집 창을 숨긴 채 미리 띄워 두고 캡처 뒤 보이기만 하는 방법이 쓰입니다. 근거는 개인 블로그 측정 하나뿐입니다.
- 2560×1664 화면 한 장은 RGBA로 약 17MB입니다. 웹 화면으로 넘길 때 JSON과 base64를 피하고 바이트 응답이나 사용자 정의 프로토콜로 넘겨야 합니다.
- 실제로 편집기가 몇 ms 만에 열리는지는 측정하지 않았습니다.

### 클립보드와 전역 단축키

- **클립보드:** `tauri-plugin-clipboard-manager` 2.5.0의 이미지 쓰기는 RGBA 바이트를 받습니다. 큰 이미지는 Rust 쪽에서 직접 씁니다. 붙여 넣은 곳에서 Retina 배율이 유지되는지는 확인하지 못했습니다.
- **전역 단축키:** `global-shortcut` 플러그인은 기본으로 허용된 권한이 없어 설정 파일에 등록 권한을 넣어야 합니다. 다른 앱과 단축키가 겹치면 등록이 실패할 수 있습니다. 저장소 [작업 규칙](../../../AGENTS.md)에 따라 등록 실패는 자동 검사에 넣습니다.

### 화면 녹화 GIF 생성기에서 가져올 교훈

- **배율과 선택 화면 위치([QA-003](../../screen-gif/docs/qa-issues.md#qa-003-macos에서-드래그한-영역과-다른-곳이-녹화됨)):** macOS의 모니터 찾기는 포인트 단위를 받는데 픽셀을 넘겨 배율이 틀렸습니다. 화면 전체를 덮는 창은 macOS가 메뉴 막대 아래로 옮깁니다.
- **Esc(QA-005):** 다시 연 선택 화면이 키 입력을 받지 못하는 경우가 있었습니다.
- **권한 순서(QA-014):** 화면 기록 권한이 없을 때 선택 화면을 띄우면 시스템 설정을 가립니다. 권한부터 확인합니다.
- **막대 배치(QA-015):** Dock과 메뉴 막대를 뺀 영역에 둡니다.
- **앱 창 숨기기:** Tauri의 창 공유 차단 설정은 ScreenCaptureKit 캡처에 통하지 않습니다. 캡처 필터에서 이 앱의 창을 뺍니다.
- **권한 유지:** 임시 서명 빌드는 업데이트 뒤 화면 기록 권한을 잃을 수 있습니다. 새 앱은 권한도 따로 받습니다.

**정지 화면에서 고르는 방식(추론)**

먼저 화면 전체를 찍고 그 정지 이미지 위에서 영역을 고르는 방식입니다. 이렇게 하면 선택 화면이 캡처에 찍힐 걱정이 없고, 메뉴 막대 영역도 이미지에서 잘라 내면 됩니다. Shottr와 Flameshot도 화면을 멈춘 상태에서 고릅니다. 위 교훈 중 일부를 피할 수 있다는 것은 검증하지 않은 추론입니다.

## 확인하지 못한 것

- macOS 마크업의 `⌘Z` 지원과 화살표 도형(Apple 공식 문서 기준)
- Windows 캡처 도구의 글자 도구 정식 배포, 편집기 자동 열기 설정, 사용자 PC의 Quick markup 유무
- CleanShot X의 편집기 자동 열기 설정, Snagit 개인 가격
- `screencapturekit` 12.0의 큰 변경 내용
- Tauri 편집 창이 뜨는 시간과 이미지 전달 시간

## 출처

모두 2026-11-22에 확인했습니다.

**운영체제 기본 도구**

- [Take a screenshot on Mac (Apple)](https://support.apple.com/en-us/102646)
- [Mark up files on Mac (Apple)](https://support.apple.com/guide/mac-help/mchl1fd88863/)
- [Tidbits: Mac 마크업 도형 (2018-11-19)](https://tidbits.com/2018/11/19/macos-hidden-treasures-the-macs-hidden-markup-tools/)
- [MacRumors: macOS 27 기능 (2026-09-17)](https://macrumors.com/2026/09/17/new-features-changes-macos-27/)
- [Use Snipping Tool (Microsoft)](https://support.microsoft.com/en-us/windows/use-snipping-tool-to-capture-screenshots-00246869-1843-655f-f220-97299b865f6b)
- [Windows Insider 블로그: Quick markup (2025-09-17)](https://blogs.windows.com/windows-insider/2025/09/17/paint-snipping-tool-and-notepad-app-updates-begin-rolling-out-to-windows-insiders/)
- [BetaNews: 캡처 도구 글자 도구 (2025-11-10)](https://betanews.com/2025/11/10/microsoft-is-updating-windows-11s-snipping-tool-with-option-to-add-text-to-screenshots/)
- [Microsoft Q&A: 알림을 눌러야 편집기가 열림 (2026-03)](https://learn.microsoft.com/en-us/answers/a/12689731)

**기존 앱**

- [Shottr](https://shottr.cc/), [Shottr 시작 안내](https://shottr.cc/kb/startguide), [Shottr 1.10 소식 (2026-11)](https://alternativeto.net/news/2026/11/macos-screenshot-utility-shottr-1-10-brings-smarter-screen-capture-and-many-improvements/)
- [CleanShot 가격](https://cleanshot.com/pricing), [CleanShot 기능](https://cleanshot.com/features)
- [Snagit 기능](https://www.techsmith.com/snagit/features/)
- [ShareX](https://getsharex.com/), [Flameshot](https://flameshot.org/), [Greenshot](https://getgreenshot.org/), [Ksnip](https://github.com/ksnip/ksnip)

**구현 기술**

- [SCScreenshotManager (Apple)](https://developer.apple.com/documentation/screencapturekit/scscreenshotmanager), [포인트 크기로 흐려짐 보고](https://developer.apple.com/forums/thread/739593)
- [macOS 27에서 CGWindowListCreateImage 회색 이미지 보고 (Apple 포럼)](https://developer.apple.com/forums/thread/849969)
- [screencapturekit 크레이트](https://docs.rs/screencapturekit/latest/screencapturekit/screenshot_manager/struct.SCScreenshotManager.html), [xcap](https://github.com/nashaofu/xcap), [windows-capture](https://docs.rs/windows-capture/2.0.1/windows_capture/)
- [Konva 글자 편집](https://konvajs.org/docs/sandbox/Editable_Text.html), [Konva 되돌리기](https://konvajs.org/docs/react/Undo-Redo.html), [Konva 고해상도 내보내기](https://konvajs.org/docs/data_and_serialization/High-Quality-Export.html)
- [Fabric 픽셀화 필터](https://fabricjs.com/api/namespaces/filters/classes/pixelate), [tldraw 라이선스 키](https://tldraw.dev/sdk-features/license-key), [Excalidraw npm](https://www.npmjs.com/package/@excalidraw/excalidraw)
- [PKCanvasView (Apple)](https://developer.apple.com/documentation/pencilkit/pkcanvasview)
- [Tauri 클립보드](https://v2.tauri.app/reference/javascript/clipboard-manager/), [Tauri 전역 단축키](https://v2.tauri.app/plugin/global-shortcut/), [숨긴 창 미리 띄우기 측정 블로그](https://dev.to/tinyforge/tauri-cold-launch-was-1s-heres-how-i-got-it-to-feel-instant-32lh)
