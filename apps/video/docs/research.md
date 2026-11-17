# 동영상 앱 기술 조사

조사일: 2026-11-13

기술 선택의 근거와 조사 결과를 기록합니다. 앱의 목표와 첫 사용 흐름은 [동영상 앱](scope.md)에 있습니다.

## 결정

Kotlin, Jetpack Compose, libVLC, Room으로 안드로이드 앱을 만듭니다.

- 선택 기준: 다양한 파일 지원과 직접 유지보수할 범위
- 제외한 기준: PC와의 코드 재사용
- 미검증: 실제 파일 재생과 기기별 성능

## 기술별 역할과 선택 근거

### Kotlin과 Jetpack Compose

Kotlin으로 앱의 동작을, Compose로 화면과 조작을 구현합니다. Compose는 Android가 권장하는 Kotlin 기반 화면 개발 도구입니다. [Compose 공식 문서](https://developer.android.com/compose)

영상은 libVLC의 `VLCVideoLayout`으로 출력합니다. 기존 Android 화면 요소를 Compose에 넣는 `AndroidView`로 연결합니다. 화면 회전과 앱 종료 시 재생 객체와 출력 영역을 연결하고 해제하는 처리가 필요합니다. [AndroidView 공식 문서](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/views-in-compose)

### libVLC

영상과 음성, 자막을 재생합니다. VLC의 재생 기능을 앱에 넣고 화면과 조작은 직접 만듭니다. [VideoLAN 공식 설명](https://github.com/videolan/vlc-android#libvlc)

첫 검증 버전은 Maven Central에서 확인했습니다. [버전 목록](https://repo.maven.apache.org/maven2/org/videolan/android/libvlc-all/maven-metadata.xml), [3.7.7 배포 정보](https://repo.maven.apache.org/maven2/org/videolan/android/libvlc-all/3.7.7/libvlc-all-3.7.7.pom)

- 의존성: `org.videolan.android:libvlc-all:3.7.7`
- 배포 파일에 표시된 게시일: 2026-10-01

같은 버전의 API 문서에서 앱이 호출할 수 있는 기능을 확인했습니다. [3.7.7 API 문서 배포본](https://repo.maven.apache.org/maven2/org/videolan/android/libvlc-all/3.7.7/libvlc-all-3.7.7-javadoc.jar)

- 영상 출력 연결과 해제
- 외부 자막 연결
- 재생 위치 조회와 이동
- 자막 표시 시점 조절

실제 파일 재생과 한글 자막 표시는 아직 확인하지 않았습니다.

### Room

영상별 마지막 재생 위치를 기기 안에 저장합니다. Room은 SQLite 데이터베이스 접근과 데이터 구조 변경을 지원하는 Android 라이브러리입니다. [Room 공식 문서](https://developer.android.com/training/data-storage/room)

파일 접근 권한은 재생 위치와 별도로 유지합니다. 파일이 이동하거나 삭제되면 위치가 저장되어 있어도 이어볼 수 없을 수 있습니다.

## 파일 접근 방식

- 시스템 선택기로 사용자가 접근을 허용한 폴더의 영상을 보여줍니다.
- 시스템 파일 선택기로 영상 하나를 직접 여는 방법도 제공합니다.

Android 11 이상에서는 시스템 폴더 선택기로 내부 저장소 최상위나 `Download` 폴더 전체의 접근 권한을 받을 수 없습니다. `Download` 안의 영상을 개별 파일로 선택하는 동작은 폴더 전체를 허용하는 동작과 구분합니다. [파일 및 폴더 접근 공식 문서](https://developer.android.com/training/data-storage/shared/documents-files)

기기를 다시 시작한 뒤에도 이어볼 수 있도록 파일 접근 권한을 저장합니다. 파일 이동과 삭제, 권한 취소가 발생하면 다시 선택할 수 있게 합니다. [접근 권한 유지](https://developer.android.com/training/data-storage/shared/documents-files#persist-permissions)

## 배포 파일에서 확인한 호환성

일부 최신 Android 기기는 메모리를 16KB 단위로 처리합니다. libVLC처럼 C/C++로 작성된 라이브러리를 포함하는 앱은 해당 환경에 맞는 배포 파일과 앱 패키징이 필요합니다. [Android의 16KB 지원 기준](https://developer.android.com/guide/practices/page-sizes)

공식 저장소의 `libvlc-all-3.7.7.aar`를 메모리에서 읽어 검사했습니다. 파일로 저장하거나 라이브러리를 실행하지 않았습니다.

- 검사 대상: `arm64-v8a`와 `x86_64` 각각의 `libc++_shared.so`, `libvlc.so`, `libvlcjni.so`, 총 6개
- 검사 방법: ELF라는 실행 파일 형식의 헤더에서 메모리에 적재하는 구간의 정렬 값과 파일 위치를 확인
- 결과: 6개 모두 정렬 값이 16,384바이트이며, 파일 위치와 메모리 주소의 16KB 기준 나머지가 일치
- 배포 파일 크기: 92,576,688바이트. 여러 기기용 라이브러리를 포함한 배포 파일 크기이며, 완성 앱의 설치 크기는 아님
- SHA-256: `b48dab96e0e90e34cce3861963500c144a5aadb1b249d501d6a4b104d849e61b`

[검사한 공식 배포 파일](https://repo.maven.apache.org/maven2/org/videolan/android/libvlc-all/3.7.7/libvlc-all-3.7.7.aar)

2026-11-13 조사에서 확인한 범위는 배포 파일의 정렬 조건입니다. 당시 다음 항목은 미검증이었습니다.

- 완성 앱의 패키징
- 16KB 환경에서의 설치와 실행
- S25와 두 번째 기기에서의 호환성

2026-11-14에 완성 APK의 정렬 조건을 추가 확인했습니다. 설치와 실제 재생은 아직 미검증이며, 결과는 [검증 기록](verification.md#2026-11-14-로컬-검증)에 있습니다.

## 다른 선택지와의 비교

### Media3의 ExoPlayer

기본적으로 Android 기기의 영상과 음성 처리 기능을 사용합니다. 별도 소프트웨어 확장도 추가할 수 있습니다. [Media3 지원 형식](https://developer.android.com/media/media3/exoplayer/supported-formats)

이번에는 다양한 파일을 처리하는 기능을 묶어 제공하는 libVLC를 선택했습니다. ExoPlayer와의 성능이나 배터리 사용량 비교는 하지 않았습니다.

### 웹뷰

웹뷰에서 화면과 영상 재생을 모두 처리하면 브라우저가 지원하는 파일과 압축 방식의 제약을 받습니다. 다양한 파일을 재생하는 이번 목표에는 적합하지 않다고 판단했습니다. [웹의 영상 형식 지원](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers)

화면만 웹으로 만들고 재생은 libVLC에 맡길 수도 있습니다. 이 경우 파일 선택, 재생 명령과 상태를 웹과 Android 사이에서 주고받는 코드가 필요합니다. [웹과 Android 코드 연결](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge)

현재의 폴더 탐색과 재생 흐름은 Kotlin과 Compose로 통일합니다.

## 구현 후 확인할 항목

실제 재생, 자막, 이어보기, 업데이트 후 데이터 보존과 기기별 동작은 [검증 기록](verification.md#검사-항목)에서 관리합니다. 확인용 파일 정보와 실행 결과도 해당 문서에 남깁니다.

## 시제품의 빌드 구성

2026-11-14에 다음 버전으로 고정했습니다. 최신 버전 목록이 아니라 시제품에서 사용하는 조합입니다.

- Android Gradle Plugin 8.13.2, Gradle 8.14.3, JDK 17
- Kotlin과 Compose 컴파일러 플러그인 2.2.21
- Compose 라이브러리 버전 묶음(BOM) 2025.10.01
- Room 2.8.4, Room 코드 생성 도구 KSP 2.2.21-2.0.5
- libVLC 3.7.7

Android Gradle Plugin 8.13 계열은 Gradle 8.13 이상과 JDK 17을 요구하며 SDK 36을 지원합니다. 설치된 도구와 이 범위에 맞춰 조합했습니다. [빌드 도구 호환 기준](https://developer.android.com/build/releases/agp-8-13-0-release-notes)

Compose 컴파일러 플러그인은 Kotlin과 같은 버전을 사용합니다. 나머지 Compose 라이브러리는 BOM으로 맞춥니다. [Compose 설정](https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler)

libVLC의 `FileDescriptor` 입력으로 시스템 선택기에서 받은 파일을 읽기 전용으로 엽니다. 파일 연결은 재생기가 해제될 때 닫습니다. 화면은 `VLCVideoLayout`을 `AndroidView`에 연결하며, 재생 위치 복원 전의 초기값을 저장하지 않도록 처리합니다. [libVLC 3.7.7 소스](https://repo.maven.apache.org/maven2/org/videolan/android/libvlc-all/3.7.7/libvlc-all-3.7.7-sources.jar)

## 재생 위치 이동 처리

2026-11-15에 QA-005부터 QA-007까지의 수정에서 아래 동작을 적용했습니다. 라이브러리 버전과 저장 구조는 바꾸지 않았습니다.

- 재생바를 끄는 동안에는 재생을 잠시 멈추고, 약 100ms 간격으로 최신 위치의 장면을 요청합니다. 손을 놓으면 마지막 위치를 바로 적용하고, 원래 재생 중이었다면 재생을 이어갑니다.
- 사용자가 고른 위치는 멈춘 상태에서도 이어보기 위치로 저장합니다. 처음 파일을 여는 중의 초기 시간과 이전 위치 이벤트로 기록을 덮어쓰지 않는 처리는 유지합니다.
- 파일 안에서 영상과 음성 데이터를 찾아 전달하는 처리를 demux라고 합니다. 기본 설정에서 4K MP4 샘플을 탐색하면 참조 장면 누락 로그와 회색 화면이 나타났고, 하드웨어 가속을 꺼도 같았습니다. 내장 `avformat` 처리를 우선 사용한 비교 빌드에서는 목표 장면이 표시됐습니다. 이에 `:demux=avformat,any`를 적용했습니다. `any`는 해당 처리가 파일을 열지 못하면 다른 libVLC 처리 방식도 시도하게 합니다. 이 순서는 [VLC 모듈 선택 코드](https://github.com/videolan/vlc/blob/3.0.x/src/modules/modules.c)에서 확인했습니다. 모든 형식의 호환성을 확인한 결과는 아닙니다.
- 재생이 끝난 뒤에는 기존 입력을 멈추고 파일의 읽기 위치를 처음으로 되돌린 다음, 선택한 시간부터 다시 준비합니다. 파일 내용은 수정하지 않습니다. VLC의 파일 연결 복제는 읽기 위치를 공유하므로, 끝에 도달한 연결을 그대로 다시 사용하면 입력이 비어 있는 상태로 시작할 수 있습니다. [VLC 파일 입력 코드](https://github.com/videolan/vlc/blob/3.0.x/modules/access/file.c)

하드웨어 가속은 기존 설정을 유지합니다. 샘플별 결과와 실제 기기에서 확인하지 못한 범위는 [검증 기록](verification.md#2026-11-15-재생바와-이어보기-수정-검증)에 남깁니다.

## 2026-11-17 자막 기능 조사

사용자 요청으로 서브에이전트가 공식 자료와 설치된 `libvlc-all-3.7.7-sources.jar`를 읽기 전용으로 조사했습니다. 부모 에이전트도 해당 소스의 자막 API 선언을 확인했습니다. 아래는 구현 제안이며 기기에서 검증된 지원 목록이 아닙니다.

### 먼저 구현할 기능

1. 자막 끄기, 내장 자막 목록과 선택, 외부 UTF-8 SRT 열기.
2. 자막을 0.1초 일찍 또는 늦게 표시하는 싱크 조절과 초기화.
3. 영상별 외부 자막 주소와 싱크 저장. Room 구조를 바꾸면 기존 재생 기록 보존 검사가 필요합니다.
4. 글자 크기와 인코딩 선택. 별도로 재생 상태 복원 방식을 검증합니다.

### 현재 버전의 API와 수명

3.7.7의 `getSpuTracks()`는 자막 ID와 이름을 반환하고 `setSpuTrack(int)`로 선택합니다. 배열 순번 대신 반환된 ID를 사용하며, 트랙 추가와 삭제, 선택 이벤트에서 화면을 갱신해야 합니다. 최신 VLC Android의 문자열 트랙 ID API를 그대로 적용하지 않습니다.

`setSpuDelay(long)`는 마이크로초 단위입니다. 양수는 늦게, 음수는 일찍 표시하며, 미디어 변경 시 초기화되므로 재적용해야 합니다. [공식 libVLC 3 자막 제어 문서](https://videolan.videolan.me/vlc-3.0/group__libvlc__video.html).

외부 파일은 시스템 파일 선택기로 고르고 읽기 권한을 보존합니다. 영구 저장 대상은 원본 URI이며 열려 있는 파일 번호가 아닙니다. 파일이 이동하거나 삭제되면 권한을 보존했어도 재선택이 필요할 수 있습니다. [Android 파일 접근 문서](https://developer.android.com/training/data-storage/shared/documents-files).

연결 후보는 `ContentResolver.openFileDescriptor(uri, "r")`로 파일을 열고 `fd://` 주소를 `addSlave(IMedia.Slave.Type.Subtitle, uri, true)`에 전달하는 방식입니다. `VlcPlayback`이 파일 연결을 소유하고 엔진의 사용이 끝난 뒤 닫아야 합니다. 클라우드 제공자의 탐색 불가 입력은 실제 검증이 필요하며, 필요한 경우 앱 내부 임시 복사본을 검토합니다. 원본은 수정하지 않습니다. [공식 VLC 파일 처리](https://github.com/videolan/vlc-android/blob/master/application/vlc-android/src/org/videolan/vlc/util/FileUtils.kt), [공식 자막 연결부](https://github.com/videolan/vlc-android/blob/master/application/vlc-android/src/org/videolan/vlc/gui/video/VideoPlayerActivity.kt).

현재 `VlcPlayback.restartMedia()`는 미디어 객체를 다시 만듭니다. 영상 종료 후 다시 재생하거나 위치를 바꾸는 이 경로에도 외부 자막 연결, 선택과 싱크를 복원해야 합니다.

### 글자 크기와 검증 범위

3.7.7 Java API에는 실시간 자막 크기 setter가 없습니다. `--freetype-rel-fontsize` 생성 옵션을 검증하고, 크기를 바꿀 때 재생기 재생성과 함께 위치, 재생 의도, 자막 선택과 싱크를 복원하는 방안을 검토합니다. ASS의 자체 스타일과 이미지 자막에 같은 설정이 적용된다고 보장하지 않습니다. [공식 VLC 옵션 구현](https://github.com/videolan/vlc-android/blob/master/application/resources/src/main/java/org/videolan/resources/VLCOptions.kt), [VLC 3 ASS 디코더](https://github.com/videolan/vlc/blob/3.0.x/modules/codec/libass.c).

첫 검증은 한글 UTF-8 SRT와 다중 내장 자막으로 시작합니다. 이후 ASS/SSA, SMI/SAMI, WebVTT, CP949/EUC-KR과 이미지 자막 샘플을 추가합니다. 선택 취소, 권한 거절, 파일 이동과 삭제, 회전, 재생 종료 후 다시 열기와 업데이트 후 보존을 확인합니다. 자막 실패 때문에 영상 자체를 사용할 수 없게 만들지 않습니다.
