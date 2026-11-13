# 동영상 앱 기술 조사

조사일: 2026-11-13

기술 선택의 근거와 조사 결과를 기록합니다. 앱의 목표와 첫 사용 흐름은 [동영상 앱](video-app.md)에 있습니다.

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

확인한 범위는 배포 파일의 정렬 조건입니다. 다음 항목은 미검증입니다.

- 완성 앱의 패키징
- 16KB 환경에서의 설치와 실행
- S25와 두 번째 기기에서의 호환성

## 다른 선택지와의 비교

### Media3의 ExoPlayer

기본적으로 Android 기기의 영상과 음성 처리 기능을 사용합니다. 별도 소프트웨어 확장도 추가할 수 있습니다. [Media3 지원 형식](https://developer.android.com/media/media3/exoplayer/supported-formats)

이번에는 다양한 파일을 처리하는 기능을 묶어 제공하는 libVLC를 선택했습니다. ExoPlayer와의 성능이나 배터리 사용량 비교는 하지 않았습니다.

### 웹뷰

웹뷰에서 화면과 영상 재생을 모두 처리하면 브라우저가 지원하는 파일과 압축 방식의 제약을 받습니다. 다양한 파일을 재생하는 이번 목표에는 적합하지 않다고 판단했습니다. [웹의 영상 형식 지원](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers)

화면만 웹으로 만들고 재생은 libVLC에 맡길 수도 있습니다. 이 경우 파일 선택, 재생 명령과 상태를 웹과 Android 사이에서 주고받는 코드가 필요합니다. [웹과 Android 코드 연결](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge)

현재의 폴더 탐색과 재생 흐름은 Kotlin과 Compose로 통일합니다.

## 구현 후 확인할 항목

실제 재생, 자막, 이어보기, 업데이트 후 데이터 보존과 기기별 동작은 [검증 기록](video-app-verification.md#검사-항목)에서 관리합니다. 확인용 파일 정보와 실행 결과도 해당 문서에 남깁니다.
