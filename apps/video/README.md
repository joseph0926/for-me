# 동영상 앱

휴대폰에 저장한 파일을 재생하는 동영상 앱입니다. Android부터 개발하고, 이후 Windows와 macOS로 확장합니다.

공통 개발 절차는 [개발 절차](../../docs/development.md), 조작과 증거 수집 방법은 [QA 절차](../../docs/qa.md)를 따릅니다.

## 현재 상태

2026-11-20 기준으로 Android 시제품을 개발 중입니다.

- 시스템 파일 선택기로 영상을 열고, 재생 위치를 저장해 이어봅니다.
- Viewgrain의 SCENE과 FRAME 레퍼런스로 홈, 보관함과 재생 화면을 리디자인했습니다. Viewgrain은 이후 [폐기](../../docs/retired-viewgrain.md)했습니다. 실제 파일의 썸네일과 최근 20개 기록을 표시하며, 보관함에서 제목을 검색합니다.
- 영상 영역을 누르면 재생과 일시정지가 전환됩니다. 재생바와 버튼 묶음은 세로와 가로 모두 가운데에 배치합니다.
- 오른쪽 위 자물쇠로 화면을 잠급니다. 잠금 중 화면 터치와 뒤로 가기는 해제 버튼만 표시하며, 회전해도 잠금은 유지됩니다.
- 재생 화면 위쪽의 **자막**에서 영상에 들어 있는 자막을 고르거나 끌 수 있습니다. **외부 SRT 열기**에서 UTF-8로 저장한 SRT 파일을 선택합니다. 자막은 0.1초씩 일찍 또는 늦게 표시할 수 있고, 외부 SRT는 글자 크기도 바꿀 수 있습니다. 영상마다 선택과 설정을 기억합니다.
- **보관함 → 폴더별 영상 → 폴더 추가**에서 폴더를 선택합니다. 목록에서 하위 폴더로 들어가 영상을 재생할 수 있고, 재생을 닫으면 보던 폴더로 돌아옵니다. 파일을 추가하거나 옮긴 뒤에는 **새로고침**을 누릅니다.

2026-11-20 [자막 검증](docs/verification.md#2026-11-20-자막-선택과-표시)에서 Android 17 가상 기기로 한글과 영어 내장 자막 전환, 외부 한글 SRT 표시와 설정 복원을 확인했습니다. 실제 휴대폰 검증은 남아 있습니다.

2026-11-17 [화면 잠금 검증](docs/verification.md#2026-11-17-화면-잠금-검증)에서 디버그와 릴리스 빌드, 테스트 13개가 통과했습니다. Android 17 가상 기기에서 터치 재생, 잠금과 해제를 확인했습니다. Android Lint는 대상 SDK 관련 기존 오류 1건으로 실패했고, 이후 [Lint 처리 기준 변경](docs/verification.md#2026-11-17-대상-sdk-알림의-lint-등급-변경)에서 이 알림을 정보로 낮췄습니다. 원래 실패한 머신의 재검증은 남아 있습니다. 실제 휴대폰과 음성, 자막 재생은 이번 검증에 포함하지 않았습니다. 과거 실행 결과와 남은 검사는 [검증 기록](docs/verification.md), 결함 상태는 [QA 이슈](docs/qa-issues.md)에 있습니다.

## 문서

- [범위](docs/scope.md): 만들 기능과 완료 기준
- [기술 조사](docs/research.md): 기술 선택의 근거와 조사 결과
- [QA](docs/qa.md): ADB 조작 방법과 확인 항목
- [검증 기록](docs/verification.md): 검사할 항목과 실행 결과
- [QA 이슈](docs/qa-issues.md): 발견한 문제의 우선순위, 현재 상태와 다음 조치

## 개발 환경

- JDK 17
- Android SDK Platform 36
- Android SDK Build-Tools 36.0.0
- Gradle 8.14.3: 이 폴더의 `gradlew` 사용

이 폴더(`apps/video`)가 Gradle 빌드의 기준 폴더입니다. Android Studio에서도 저장소 루트가 아니라 이 폴더를 엽니다. Gradle 실행에 JDK 17을 사용합니다. `gradle/gradle-daemon-jvm.properties`도 17로 고정하며 JDK 자동 설치는 사용하지 않습니다.

SDK 위치는 `ANDROID_HOME` 또는 Git에서 제외한 `apps/video/local.properties`의 `sdk.dir`로 지정합니다. 전역 Gradle 설치는 필요하지 않습니다.

| 항목 | macOS | Windows |
|---|---|---|
| Gradle 실행 | `./gradlew` | PowerShell은 `.\gradlew.bat`, Git Bash는 `./gradlew` |
| SDK 기본 경로 | `~/Library/Android/sdk` | `%LOCALAPPDATA%\Android\Sdk` |
| ADB | `$ANDROID_HOME/platform-tools/adb` | `%ANDROID_HOME%\platform-tools\adb.exe` |

- `local.properties`는 Android Studio가 머신마다 만듭니다. 다른 운영체제의 사본에 복사하지 않습니다.
- `JAVA_HOME`이 JDK 17을 가리켜야 합니다. Android Studio에 포함된 JDK를 쓰면 터미널의 `JAVA_HOME`도 그 경로로 지정합니다.

## Android

앱 식별자는 `dev.forme.video`입니다. 최소 Android 버전은 8.0(API 26)이며, 빌드와 대상 SDK는 36입니다. `arm64-v8a`와 `x86_64`용 라이브러리를 포함합니다.

Gradle 모듈은 `:android`이고 폴더는 `apps/video/android`입니다.

### 자동 검사

`apps/video` 폴더에서 실행합니다.

```bash
./gradlew --no-daemon :android:lintDebug :android:testDebugUnitTest :android:assembleDebug :android:assembleRelease
```

- 코드 검사: Android Lint로 오류와 플랫폼 사용 문제를 확인합니다.
- 테스트: 재생 위치 저장과 복구 등 변경한 동작을 확인합니다.
- 앱 빌드: 디버그 APK와 서명하지 않은 릴리스 APK를 만듭니다. APK는 Android 앱 설치 파일입니다.

Lint 경고는 오류로 처리합니다. 새 라이브러리나 빌드 도구 버전이 나왔다는 알림 3종과 새 Android 버전이 나와 대상 SDK가 최신이 아니라는 알림(`OldTargetApi`)은 정보로 표시하며, 업데이트는 호환성을 확인한 뒤 반영합니다. 대상 SDK 상향은 그 SDK를 지원하는 Android Gradle 플러그인으로의 변경과 기기 검증을 함께 진행합니다.

기기에 설치할 파일은 `apps/video/android/build/outputs/apk/debug/android-debug.apk`입니다. 릴리스 파일은 `apps/video/android/build/outputs/apk/release/android-release-unsigned.apk`이며, 서명과 외부 배포는 수행하지 않습니다.

코드 검사 보고서는 `apps/video/android/build/reports/lint-results-debug.html`, 테스트 보고서는 `apps/video/android/build/reports/tests/testDebugUnitTest/index.html`에 생성됩니다.

재생기를 흉내 낸 테스트는 앱의 상태 처리를 확인하는 데 쓰고, libVLC의 실제 재생은 기기에서 확인합니다.

현재 로컬 테스트는 재생 위치 처리와 Room 데이터 보존, 파일 접근 실패를 검사합니다. Room과 파일 접근 테스트는 Android 동작을 개발 머신에서 재현하는 Robolectric을 사용합니다. 실제 시스템 권한과 기기 동작을 확인하는 검사는 아닙니다.

Room의 저장 구조는 `apps/video/android/schemas`에 남깁니다. 구조를 바꿀 때는 기존 기록을 보존하는 변환과 검사를 함께 추가합니다.

재생 중에는 약 2초마다 위치를 저장하고, 일시정지와 화면 종료 때도 저장합니다. 강제 종료나 전원 차단 직전의 위치까지 저장된다고 보장하지 않습니다. 실제 업데이트 검증에는 같은 서명 키를 사용해야 합니다.

### 기기 검증

실제 기기 검증은 갤럭시 S25에서 시작하고 두 번째 기기로 넓힙니다.

기본 순서는 다음과 같습니다.

설치 → 영상 재생 → 앱 종료 → 이어보기 → 업데이트 설치 → 이어보기 재확인

- 업데이트 전 버전에서 저장한 재생 위치와 파일 접근이 유지되는지 확인합니다.
- 기기 재시작, 권한 취소, 파일 이동과 삭제도 해당 변경에 맞춰 확인합니다.

세부 항목과 기록 형식은 [검증 기록](docs/verification.md)을 사용합니다.
