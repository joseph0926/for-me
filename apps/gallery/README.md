# 갤러리 앱

휴대폰에 저장한 사진과 영상을 보는 Android 앱입니다. 앱 식별자는 `dev.forme.gallery`입니다(2026-11-28 사용자 결정). 앱 이름은 아직 정하지 않았고 화면에는 임시로 "갤러리"라고 나옵니다.

공통 개발 절차는 [개발 절차](../../docs/development.md), 조작과 증거 수집 방법은 [QA 절차](../../docs/qa.md)를 따릅니다.

## 현재 상태

2026-11-28에 0.1.0으로 보관함을 만들었습니다. 기기의 사진과 동영상을 연, 월, 일, 전체 단위로 묶어 보여 주고, 전체 허용, 부분 허용, 거절마다 다른 안내를 보입니다. Android 14 가상 기기에서 확인했습니다([검증 기록](docs/verification.md#2026-11-28-010-보관함-가상-기기-확인)). 사진 보기, 선택, 앨범, 휴지통은 아직 없고, 칸을 눌러도 아무 일도 일어나지 않습니다.

개발 스택은 정했습니다(Android 14 이상, MediaStore, Media3 영상 재생, Kotlin과 Compose). 확인 창 없이 휴지통을 처리하는 미디어 관리 권한은 Android 14와 17 가상 기기 최소 실험을 통과했습니다. 사진 읽기가 전체 허용일 때만 확인 창이 생략됩니다. 실제 휴대폰은 미검증입니다.

## 문서

- [범위](docs/scope.md): 목표, 첫 버전에 넣는 기능과 뺀 기능, 할 일
- [기술 조사](docs/research.md): 개발 스택 결정과 착수 전 최소 실험, 사진과 영상 읽기 권한(부분 허용 포함), Google Play 사진 권한 정책, MediaStore 휴지통 요청, 썸네일 성능, 참고할 오픈소스 갤러리
- [검증 기록](docs/verification.md): 미디어 관리 권한 가상 기기 실험(Android 14, 17), 빌드 구성 확인, 0.1.0 보관함 확인

## 개발 환경

[장면](../video/README.md#개발-환경)과 같습니다. JDK 17, Android SDK Platform 36, Build-Tools 36.0.0, 이 폴더의 `gradlew`(Gradle 8.14.3)를 씁니다. 이 폴더(`apps/gallery`)가 Gradle 빌드의 기준 폴더이고, SDK 위치는 `ANDROID_HOME` 또는 Git에서 제외한 `apps/gallery/local.properties`의 `sdk.dir`로 지정합니다.

- `android/build.gradle.kts`에서 `buildToolsVersion`을 지우지 않습니다. 정하지 않으면 Android Gradle 플러그인이 SDK에 다른 Build-Tools를 자동으로 설치합니다.

## Android

최소 Android 버전은 14(API 34)이고 빌드와 대상 SDK는 36입니다. Gradle 모듈은 `:android`입니다.

### 자동 검사

`apps/gallery` 폴더에서 실행합니다.

```bash
./gradlew --no-daemon :android:lintDebug :android:testDebugUnitTest :android:assembleDebug :android:assembleRelease
```

- 코드 검사: Android Lint 경고를 오류로 처리합니다. 새 버전 알림과 대상 SDK 알림은 장면과 같이 정보로 표시합니다.
- 테스트: 날짜 묶기(기기 시간대 기준), 연과 월 카드의 대표 사진, 일 단위의 큰 칸 고르기, 카드에서 내려갈 단위와 줄, 날짜와 개수와 재생 길이 표기를 검사합니다. Android 없이 도는 JVM 검사이며 MediaStore와 썸네일은 검사하지 않습니다.
- 앱 빌드: 디버그 APK(`android/build/outputs/apk/debug/android-debug.apk`)와 서명하지 않은 릴리스 APK를 만듭니다.

라이브러리는 Compose, Activity, Core, Lifecycle만 넣었습니다. 격자 썸네일은 이미지 로더 없이 시스템 썸네일(`ContentResolver.loadThumbnail`)을 받아 메모리에만 캐시합니다(2026-11-28 사용자 결정). [개발 스택](docs/research.md#개발-스택)의 Telephoto, Room, Media3, ExifInterface는 그 기능을 만들 때 넣습니다.

사진 목록은 저장하지 않습니다. 화면이 다시 보일 때와 기기의 미디어가 바뀌었다는 알림이 올 때 MediaStore에서 새로 읽습니다. 앱이 저장하는 값은 권한을 한 번 물었는지(`media_access` 설정 파일의 `asked`) 하나뿐입니다.

### 버전

장면과 같은 [시맨틱 버전 규칙](../video/README.md#버전)을 씁니다. 버전은 `android/build.gradle.kts`의 `appVersion` 한 곳에서만 바꿉니다. 빌드 구성만 있는 0.0.1부터 시작했고, 보관함을 넣은 0.1.0이 첫 기능 버전입니다.
