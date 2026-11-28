# 음악 앱

휴대폰에 저장한 음악 파일을 재생하는 Android 앱입니다. 앱 이름은 아직 정하지 않았고 화면에는 임시로 "음악"이라고 나옵니다. 앱 식별자는 `dev.forme.music`입니다(2026-11-28 사용자 결정: "그대로 확정"). 이어듣기 기록과 재생 목록을 지키기 위해 바꾸지 않습니다.

공통 개발 절차는 [개발 절차](../../docs/development.md), 조작과 증거 수집 방법은 [QA 절차](../../docs/qa.md)를 따릅니다.

## 현재 상태

2026-11-28에 0.1.0으로 [첫 버전의 목표](docs/scope.md#첫-버전의-목표)를 구현했습니다. 재생 엔진은 Media3(1.11.1)입니다. Android 17 가상 기기에서 사용자 음악 사본으로 재생, 화면 밖 재생, 이어듣기, 덮어 설치, 권한 거절, 파일 삭제를 확인했습니다([검증 기록](docs/verification.md#2026-11-28-010-가상-기기-검증)). 실제 휴대폰과 이어폰 분리는 확인하지 않았습니다.

## 문서

- [범위](docs/scope.md): 목표, 첫 버전의 기능과 완료 기준, 할 일
- [기술 조사](docs/research.md): 재생 엔진 후보, Android 17 백그라운드 오디오 제한, 음악 파일 접근과 형식 지원
- [검증 기록](docs/verification.md): 재생 엔진 실험과 실행 결과
- [화면 재설계](docs/redesign.md): 묶어 찾기와 여러 곡 담기, 새 화면 켜는 법, 행동 목록과 전후 결과

## 개발 환경

[장면](../video/README.md#개발-환경)과 같습니다. JDK 17, Android SDK Platform 36, Build-Tools 36.0.0, 이 폴더의 `gradlew`(Gradle 8.14.3)를 씁니다. 이 폴더(`apps/music`)가 Gradle 빌드의 기준 폴더이고, SDK 위치는 `ANDROID_HOME` 또는 Git에서 제외한 `apps/music/local.properties`의 `sdk.dir`로 지정합니다.

`android/build.gradle.kts`에서 `buildToolsVersion`을 지우지 않습니다. 정하지 않으면 Android Gradle 플러그인이 SDK에 다른 Build-Tools를 자동으로 설치합니다.

## Android

최소 Android 버전은 8.0(API 26)이고 빌드와 대상 SDK는 36입니다. Gradle 모듈은 `:android`입니다.

### 자동 검사

`apps/music` 폴더에서 실행합니다.

```bash
./gradlew --no-daemon :android:lintDebug :android:testDebugUnitTest :android:assembleDebug :android:assembleRelease
```

- 코드 검사: Android Lint 경고를 오류로 처리합니다. 새 버전 알림과 대상 SDK 알림은 장면과 같이 정보로 표시합니다.
- 테스트: 곡 이름 만들기, 정렬과 검색, 재생 목록과 대기열 저장, 잘린 MP3의 길이 보정을 검사합니다. Room 테스트는 Robolectric을 쓰며 실제 기기 동작을 확인하는 검사가 아닙니다.
- 앱 빌드: 디버그 APK(`android/build/outputs/apk/debug/music-debug.apk`)와 서명하지 않은 릴리스 APK(`android/build/outputs/apk/release/music-release-unsigned.apk`)를 만듭니다.

Room의 저장 구조는 `android/schemas`에 남깁니다. 구조를 바꿀 때는 기존 재생 목록과 이어듣기 기록을 보존하는 변환과 검사를 함께 추가합니다.

재생 중에는 5초마다, 그리고 일시정지, 곡 넘김, 위치 이동 때 대기열과 위치를 저장합니다. 강제 종료되면 마지막 저장 뒤 최대 5초가 빠질 수 있습니다.

### 서체

재설계 화면은 Wanted Sans 가변 서체(`res/font/wanted_sans.ttf`, npm `wanted-sans` 1.0.3, SIL Open Font License 1.1)를 앱에 넣어 씁니다.

### 버전

장면과 같은 [시맨틱 버전 규칙](../video/README.md#버전)을 씁니다. 버전은 `android/build.gradle.kts`의 `appVersion` 한 곳에서만 바꿉니다. 0.1.0부터 시작했습니다.

## UI 결정

재설계 화면(`redesign` 패키지, `-Pmusic.redesign=true`)의 결정입니다. 다음 화면 작업은 이 절을 먼저 읽습니다. 이 저장소에서는 파일만 두고 커밋은 사용자가 합니다(2026-11-28 사용자 결정: "apps/music에 둠").

### 정체성

오늘의레퍼런스 완성작 [속지](../today-ref/works/2026-11-28-music/README.md)의 값입니다. 토큰은 `redesign/SokjiTheme.kt` 한 곳에 있습니다.

- 서체: Wanted Sans 하나. 제목 굵게(700), 자간 -0.02em. 화면 제목 28, 상세 제목 26, 재생 화면 곡 제목 24, 목록 행 15와 보조 줄 14.
- 바탕과 강조색: 무채색 바탕 `#f4f4f5`, 면 `#ffffff`와 `#e9e9eb`, 강조색 주홍 `#d93a1c` 하나(작은 글자는 `#c1351b`). 재생 화면은 커버 색을 어둡게 깔고 강조색은 `#ff6a45`.
- 모서리: 4dp 하나.
- 모션: 감속 곡선(0.22, 1, 0.36, 1). 시트 320ms, 화면 이동 260ms, 작은 움직임 220ms, 곡이 바뀔 때 재생 화면 배경 600ms. 흐림 등장은 쓰지 않습니다.
- 근거: 레코드 라벨의 주홍. 면을 채운 칸, 떠 있는 카드, 테두리 원으로 묶지 않습니다.

### 보호 목록

- 저장과 재생: `MusicViewModel`, `PlayerConnection`, `playback`, `data`의 동작. 재설계는 보기만 바꾸고, 여러 곡 담기와 묶음 계산은 기존 동작을 바꾸지 않고 더했습니다.
- 곡을 누르면 그 목록 순서로 바로 재생, 곡 이름은 확장자를 뺀 파일 이름, 다시 열 때 저절로 재생하지 않음.
- [행동 목록](docs/redesign.md#행동-목록과-전후-결과)의 21줄.

### 사용자 결정

- 2026-11-28 "속지를 제대로 옮기기": 재설계 정체성은 속지를 유지합니다. 어두운 무대(라임), 카세트 라벨(자주) 안은 고르지 않았습니다.
- 2026-11-28 묶음 기준은 폴더, 파일 이름의 가수, 태그 아티스트(채널), 추가한 달 네 가지 모두.
- 2026-11-28 모으기는 여러 곡 골라 담기와 묶음째 재생 목록 만들기 둘 다.
- 속지 완성작의 사용자 결정(고운바탕과 IBM Plex Sans KR로 돌아가지 않음, 누런 바탕과 흙빛 커버로 돌아가지 않음, 상자로 묶지 않음)을 따릅니다.
