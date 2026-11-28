# 음악 앱 기술 조사

조사일: 2026-11-28

Android 음악 앱 착수 전에 웹 문서로 조사하고 중앙 wiki와 대조한 결과입니다. 앱의 목표와 할 일은 [범위](scope.md)에 있습니다. 실제 휴대폰에서 재생을 확인한 것은 없고, Android 14 가상 기기의 최소 실험과 Android 17 가상 기기의 백그라운드 오디오 강제 검사 결과는 [검증 기록](verification.md)에 있습니다.

## 결정

2026-11-28 사용자 결정: "저는 엔진을 잘모르므로 권장안으로 하겠지만, 그 권장안이 최선인지는 검증이 필요ㅏㅂ니다". 재생 엔진은 Media3로 조건부 채택하고, 아래 검증을 마칠 때까지 확정하지 않습니다.

2026-11-28 사용자 결정: "Media3로 확정". [확정 조건](#검증-결과와-남은-조건) 세 가지가 가상 기기와 파일 형식 기준으로 충족된 뒤의 결정입니다. 실제 휴대폰 검사는 남아 있고, 그 결과가 아래 libVLC 전환 조건에 해당하면 다시 정합니다.

### 개발 스택

| 부분 | 선택 | 상태 |
|---|---|---|
| 플랫폼 | Android 먼저 | 사용자 결정([범위](scope.md)) |
| 재생 엔진 | Media3 ExoPlayer와 `MediaSessionService`, 안정판 1.11.1 | 사용자 결정(2026-11-28 확정). 실제 휴대폰은 미검증 |
| 음악 목록 | MediaStore(`READ_MEDIA_AUDIO`). 다른 앱이 받은 `Download` 파일만 시스템 파일 선택기 | 권장안에 포함돼 함께 채택 |
| 태그 읽기 | `media3-inspector`의 `MetadataRetriever`, 읽기 전용 | 권장안에 포함돼 함께 채택 |
| 재생 목록과 위치 저장 | Room | 권장안에 포함돼 함께 채택 |
| 언어와 화면 | Kotlin, Jetpack Compose | AI 제안, 사용자 미확정. [장면](../../video/README.md)과 같은 조합이라 빌드 구성과 검사 방식을 맞출 수 있습니다 |
| 빌드 | compileSdk와 targetSdk 36, AGP 8.13.2, Kotlin 2.2.21 | AI 제안, 사용자 미확정. 장면과 같은 값이고 가상 기기 실험 앱도 이 값으로 빌드했습니다. Media3 1.12를 쓰려면 compileSdk 37이 필요합니다. AGP 8.13.2로 compileSdk와 targetSdk 37 빌드는 됐지만 "compile SDK 36.1까지만 시험했다"는 경고가 나옵니다(2026-11-28 Windows) |

대안: 장면에서 쓰는 libVLC를 다시 쓰고 Media3 세션에 직접 연결합니다. 바꾸는 조건은 아래에 있습니다.

### 검증 결과와 남은 조건

Android 14 가상 기기 실험([검증 기록](verification.md#2026-11-28-media3-가상-기기-최소-실험))에서 확인한 것:

- 화면을 끄고 다른 앱으로 가도 `MediaSessionService`가 포그라운드 서비스와 미디어 알림을 직접 코드 없이 유지했고, 소리는 계속 나갔습니다.
- FLAC(24비트 96kHz 포함), WAV, MP3, `iTunSMPB`가 있는 AAC는 곡 사이 끊김이 없었습니다.
- 확장 없는 Media3 1.11.1에서 Opus는 곡 사이에 13.5ms 틈이 있었고, ALAC는 디코더가 없어 오류 없이 소리 없이 재생됐습니다.

Android 17 가상 기기 검사([검증 기록](verification.md#2026-11-28-android-17-가상-기기의-백그라운드-오디오-강제-검사))에서 확인한 것:

- 강제 오류 모드(`set-hardening throw`)에서 `MediaSessionService` 구조는 화면 밖 재생, 일시정지 뒤 재개 동안 위반 기록이 없었습니다. Media3 1.11.1과 targetSdk 36, Media3 1.12.0-rc01과 targetSdk 37 두 조합이 같았습니다.
- 같은 조건에서 서비스 없이 화면이 직접 재생한 대조군은 홈으로 나간 지 약 6초 뒤 `level: partial`로 막혔습니다. 기본 강제 모드에서는 소리가 막힌 뒤에도 재생기가 오류 없이 재생 중으로 위치를 늘렸습니다.

Media3를 확정하는 조건(AI 제안). 2026-11-28 가상 기기와 파일 형식 기준으로 모두 충족했고 사용자가 확정했습니다:

1. Android 17 가상 기기에서 강제 오류 모드를 켜고 화면 밖 재생, 일시정지 뒤 재개를 했을 때 위반 기록이 없습니다. 2026-11-28 가상 기기에서 통과했고, 실제 휴대폰은 미확인입니다.
2. 사용자의 실제 음악 파일 형식이 기기 디코더나 FFmpeg 확장으로 모두 재생됩니다. 2026-11-28 사용자가 옮겨 준 12곡은 모두 LAME 정보가 있는 MP3여서 기기 디코더로 충분합니다([형식 확인](verification.md#2026-11-28-사용자-음악-파일의-형식-확인)). 형식 기준의 판정이고, 이 파일들의 재생은 확인하지 않았습니다.
3. 사용자 음악에 Opus 앨범이 있으면, Media3 1.12에서 곡 사이 틈이 사라집니다. 2026-11-28 Android 17 가상 기기에서 1.12.0-rc01의 틈이 0표본으로 확인됐습니다(1.11.1은 648표본). 사용자 음악에 Opus가 없어 지금은 해당하지 않으며, 1.11.1과 compileSdk 36으로 충분합니다. Opus 곡을 들이게 되면 1.12 안정판과 compileSdk 37이 필요합니다.

libVLC로 바꾸는 조건: 실제 휴대폰에서 1번이 Media3로 통과하지 않거나, 2번에서 FFmpeg 확장으로도 재생되지 않는 형식이 사용자 음악에 있는 경우입니다. 형식 범위는 libVLC가 넓지만 세션, 포커스, 알림 연결을 직접 만들어야 하므로, 형식 문제만으로는 FFmpeg 확장을 먼저 시도합니다.

## Android 17의 백그라운드 오디오 제한

[공식 문서](https://developer.android.com/about/versions/17/changes/bg-audio)

- Android 17부터 앱 화면이 보이지 않는 상태에서 소리를 내려면 포그라운드 서비스(`SHORT_SERVICE` 유형 제외)가 실행 중이어야 합니다. 앱의 대상 SDK와 관계없이 Android 17 기기의 모든 앱에 적용됩니다.
- 대상 SDK가 37이면 그 서비스가 앱이 보이는 동안이나 사용자 조작(알림 누르기, 위젯, 외부 기기의 미디어 버튼)으로 시작된 것이어야 합니다.
- 조건을 어기면 재생과 음량 변경은 예외 없이 조용히 무시되고, 오디오 포커스 요청은 `AUDIOFOCUS_REQUEST_FAILED`를 돌려줍니다. 오류가 보이지 않으므로 자동 검사에서 따로 잡아야 합니다.
- 공식 권고는 Media3의 `MediaSessionService`를 쓰는 것입니다. 쓰지 않으면 앱이 보이는 동안 `mediaPlayback` 포그라운드 서비스를 직접 시작해야 합니다.
- 버퍼링이나 일시적인 포커스 상실처럼 10분 미만의 일시 중단에는 서비스를 유지합니다. 재생이 끝나거나 포커스를 완전히 잃거나 사용자가 멈추면 서비스와 세션을 끝내고, 사용자가 다시 재생할 때 새로 시작합니다.
- 검사 명령: 공식 문서는 `adb shell cmd audio set-enable-hardening <enable|disable|throw>`라고 적지만, 2026-11-28 Android 17 가상 기기(`CE2A.260420.051.A2`)의 명령은 `set-hardening <enable|disable|throw>`이고 되돌리기는 `clear-hardening`입니다. 문서의 이름으로는 실행되지 않으므로 먼저 `adb shell cmd audio help`로 이름을 확인합니다. `throw`는 위반 시 음량과 포커스 호출에서 `IllegalStateException`을 냅니다. 위반 기록은 `adb dumpsys audio`나 logcat의 `AudioHardening` 항목에서 봅니다. `level: partial`은 포그라운드 서비스가 없는 경우, `level: full`은 서비스는 있으나 조건을 못 갖춘 경우입니다.

## Media3 백그라운드 재생 구조

[공식 문서](https://developer.android.com/media/media3/session/background-playback)

- 재생기와 `MediaSession`을 `MediaSessionService` 안에 둡니다. 화면은 `MediaController`로 세션에 명령을 보냅니다. 알림, 잠금 화면, 블루투스 기기, 시스템 미디어 조작도 같은 세션에 연결됩니다.
- 권한: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`. 서비스는 `foregroundServiceType="mediaPlayback"`과 `androidx.media3.session.MediaSessionService` 동작으로 선언합니다.
- 알림은 재생 목록에 항목이 생기면 자동으로 만들어집니다. API 33 이상에서는 세션의 메타데이터와 버튼 설정으로 알림이 채워지므로 알림을 직접 꾸미지 않고 `MediaMetadata`와 버튼 설정을 바꿉니다.
- 일시정지, 정지, 오류 상태로 10분이 지나면 서비스가 포그라운드에서 내려옵니다.
- 최근 앱 목록에서 앱을 지우면 기본값은 재생 중일 때만 서비스를 유지합니다. `onTaskRemoved`에서 바꿀 수 있습니다.
- 재부팅 뒤 이어듣기는 기본으로 꺼져 있습니다. `MediaButtonReceiver`를 선언하면 `onPlaybackResumption()`을 반드시 구현해야 하고, 재생 목록과 현재 곡, 시작 위치는 앱이 저장해 둔 값으로 돌려줍니다. 시스템 UI의 이어듣기 알림은 `MediaLibraryService`를 구현해야 나타납니다. Android Auto도 `MediaLibraryService`를 씁니다.
- 버전: 안정판 1.11.1(2026-09-10), 시험판 1.12.0-rc01(2026-11-25). [릴리스 목록](https://developer.android.com/jetpack/androidx/releases/media3)
- 1.12.0-rc01은 compileSdk 37을 요구합니다(2026-11-28 빌드에서 AAR 메타데이터 검사가 거절). 장면은 compileSdk 36이므로 1.12를 쓰려면 Android 37 SDK 플랫폼 설치가 필요합니다. Windows에는 이미 설치돼 있었고, AGP 8.13.2로 빌드는 됐지만 "compile SDK 36.1까지만 시험했다"는 경고가 나왔습니다.
- 1.12.0-alpha02 릴리스 노트에 Ogg와 WebM의 Opus 끝 패딩 제거, 재생 목록 마지막 곡의 끝 패딩 제거가 있습니다. Android 17 가상 기기에서 1.12.0-rc01은 Ogg Opus의 곡 사이 틈과 마지막 곡 끝 패딩이 모두 0이었습니다(1.11.1은 둘 다 648표본). [검증 기록](verification.md#2026-11-28-media3-112의-opus-곡-사이-측정)

## 음악 파일 접근

[공식 문서](https://developer.android.com/training/data-storage/shared/media)

- Android 13 이상에서 다른 앱이 만든 음악 파일을 MediaStore로 읽으려면 `READ_MEDIA_AUDIO` 권한이 필요합니다. 그보다 낮은 버전은 `READ_EXTERNAL_STORAGE`입니다. 같은 문서의 Google Play 정책 경고는 사진과 동영상 권한에 대한 것입니다.
- 다른 앱이 받은 `Download` 안의 파일은 MediaStore가 아니라 시스템 파일 선택기(Storage Access Framework)로 열어야 합니다. 폴더 선택기로는 `Download` 폴더 전체를 허용받을 수 없다는 제약은 장면의 [파일 접근 조사](../../video/docs/research.md#파일-접근-방식)와 같습니다.
- 2026-11-28 Android 17 가상 기기에서는 다른 경로(adb)로 `Download/노래`에 넣은 MP3가 미디어 분석 뒤 음악(`is_music=1`)으로 분류돼 `READ_MEDIA_AUDIO`만으로 목록에 나왔습니다. 위 제약은 음악이 아닌 파일이나 분석 전 파일에 해당하는 것으로 보이며, 휴대폰에서 받은 파일로는 확인하지 않았습니다([검증 기록](verification.md#2026-11-28-010-가상-기기-검증)).
- 앱이 따로 저장한 음악 목록이 낡았는지는 `MediaStore.getVersion()` 값이 바뀌었는지로 판단하고, 바뀌면 다시 읽습니다. 버전 값의 형식은 가정하지 않습니다.

## 태그, 앨범 아트, 가사

- Media3 1.9.0(2025-12-17)부터 `media3-inspector` 모듈의 `MetadataRetriever`가 재생기 없이 파일의 메타데이터를 읽습니다. 기존 `androidx.media3.exoplayer.MetadataRetriever`는 이 모듈로 대체됐습니다. [공식 문서](https://developer.android.com/media/media3/inspector), [1.9.0 소개](https://developer.android.com/blog/posts/media3-whats-new)
- 공개 저장소의 음악 앱들은 이 모듈로 ID3의 USLT와 SYLT, MP4의 `©lyr`, Vorbis 주석의 `LYRICS` 가사를 읽습니다. 일부 형식은 원본 바이트로만 나와 앱이 직접 해석합니다. 공식 문서가 아니라 공개 코드의 사례입니다.
- 태그를 고쳐 쓰려면 TagLib의 Android 연결([AndroidTagLib](https://github.com/AmanRajAryan/AndroidTagLib) 등)이 필요합니다. 사용자의 원본 파일을 수정하지 않는다는 저장소 규칙이 있어 첫 범위에서는 읽기만 합니다.

## 지원 형식

[공식 문서](https://developer.android.com/media/media3/exoplayer/supported-formats)

- ExoPlayer는 기본으로 기기의 디코더를 씁니다. Google은 FLAC, Opus, FFmpeg 등의 소프트웨어 디코더 확장을 제공합니다.
- FLAC은 내장 추출기가 프레임을 꺼내고, API 27 이상 기기의 디코더나 FLAC 또는 FFmpeg 확장으로 풉니다.
- ALAC처럼 기기 디코더가 없는 형식은 FFmpeg 확장이 필요합니다. Google은 미리 빌드한 FFmpeg 확장을 배포하지 않습니다. Jellyfin이 `org.jellyfin.media3:media3-ffmpeg-decoder`를 배포하며, 검색 결과에 따르면 이 빌드에는 Opus 디코더가 없습니다. FFmpeg 확장을 쓰면 GPL 조건이 따라옵니다.
- 곡 사이를 끊김 없이 잇는 재생은 MP3의 Xing과 LAME 정보, AAC의 `iTunSMPB`처럼 파일에 적힌 인코더 지연과 패딩으로 처리합니다. 패딩 정보가 없는 AAC(ffmpeg로 만든 M4A)는 가상 기기 실험에서 곡 사이에 틈이 생겼습니다.
- 헤더가 적은 길이보다 실제 소리가 짧은 MP3(받다가 잘린 파일)는 Media3 1.11.1에서 실제 끝 뒤에 소리 없이 헤더 길이까지 머문 뒤 다음 곡으로 넘어갔습니다. Media3가 Xing 헤더의 길이를 믿고 재생 위치가 그 길이에 닿아야 곡을 끝내기 때문입니다. 앱에서 추출기를 감싸 파일 끝에서 길이를 다시 알리게 했습니다([검증 기록](verification.md#2026-11-28-010-가상-기기-검증)).
- ALAC는 기기 디코더가 없으면 트랙이 "지원 안 함"이 되고, 재생기는 오류 없이 소리 없이 재생합니다. 앱이 오디오가 선택되지 않은 경우를 직접 알려야 합니다.
- 공개 음악 앱 Shuttle2는 2026-09에 Media3 1.11.1로 옮기면서도 FLAC 확장을 남겼습니다. 기기 디코더가 48kHz 초과나 다채널 FLAC을 거절하는 경우의 대비라고 적었습니다([Shuttle2 #304](https://github.com/timusus/Shuttle2/issues/304)). 가상 기기의 기기 디코더는 24비트 96kHz FLAC을 재생했습니다.
- ALAC가 들어 있는 미리 빌드한 확장으로 NextLib(`io.github.anilbeesetti:nextlib-media3ext`)이 검색됐습니다. 버전과 Media3 호환 범위는 확인하지 않았습니다.
- 참고 앱 Gramophone 기준으로 32비트 정수 FLAC은 Android 14 이상, xHE-AAC는 대체로 Android 9 이상에서만 재생됩니다.

## 재생 엔진 선택지

### Media3의 ExoPlayer

백그라운드 제한, 알림, 오디오 포커스, 이어폰 분리 시 일시정지를 라이브러리가 처리합니다. Android 17 공식 문서가 권고하는 경로라 직접 유지보수할 코드가 가장 적습니다. 기기 디코더가 없는 형식은 FFmpeg 확장으로 보완합니다.

### libVLC

장면에서 쓰고 있어 형식 지원 범위와 버전 고정 경험을 다시 쓸 수 있습니다. 대신 Media3의 `SimpleBasePlayer`로 libVLC를 감싸는 코드를 직접 만들어 세션, 포커스, 이어폰 분리 처리를 붙여야 합니다. 이렇게 만든 공개 사례로 [vortex-player](https://github.com/giver720/vortex-player)가 있고, Media3 관리자는 [androidx/media #2181](https://github.com/androidx/media/issues/2181)에서 `SimpleBasePlayer`를 사용자 지정 재생기 감싸기 용도로 안내합니다. 곡 사이 끊김 없는 재생을 libVLC에서 어떻게 처리할지는 조사하지 않았습니다.

## 참고할 공개 앱

둘 다 GPLv3이므로 코드를 가져오지 않고 구조와 기능 범위만 참고합니다.

- [Gramophone](https://github.com/FoedusProgramme/Gramophone): Media3와 MediaStore로 기기 음악을 읽고 폴더 탐색, 재생 목록, 동기화 가사, ReplayGain 2.0, 시스템 이퀄라이저 연동을 지원합니다. F-Droid 1.1.2(2026-08-23)는 Android 5.0 이상을 요구합니다. 기본값으로 60초 미만 곡을 숨깁니다. [F-Droid](https://f-droid.org/en/packages/org.akanework.gramophone/)
- [Auxio](https://github.com/oxygencobalt/Auxio): 수정한 Media3와 TagLib으로 곡 사이 끊김 없는 재생, ReplayGain, Android Auto를 지원합니다. 수정한 Media3의 빌드 스크립트가 Unix 전용이라 Windows에서는 빌드할 수 없습니다.

## 중앙 wiki 대조

2026-11-28에 중앙 wiki와 대조했습니다. wiki의 음악 앱 조사 요약은 같은 날 이 문서를 옮긴 것이라 독립된 근거가 아니고, 이 문서와 어긋나는 내용도 없습니다. 아래는 이 문서에 없던 일반 기준을 wiki에서 가져온 것입니다.

- **업데이트 보존 검사의 전제.** 앱 식별자와 서명 키를 첫 설치 빌드부터 고정해야 업데이트 뒤 보존 검사가 같은 문제를 봅니다. 저장 구조의 버전과 이전 버전 데이터베이스에서의 업그레이드, 손상되거나 없는 저장 상태의 복구 경로를 첫 완료 기준에 넣습니다. 앱 식별자를 정할 때 함께 정합니다(중앙 wiki의 Device-First Release Loop).
- **백그라운드 재생 확인 방법.** 화면이 보이는 동안의 확인으로 통과 처리하지 않습니다. 강제 오류 모드(가상 기기에서는 `set-hardening throw`)를 켠 실제 휴대폰에서 화면 끄기, 다른 앱으로 가기, 일시정지 뒤 재개를 거치고 위반 기록이 없는지 봅니다(같은 페이지).
- **곡 목록 성능.** 곡 수를 기준으로 가상화나 최적화를 미리 정하지 않습니다. 릴리스 빌드에서 첫 화면 시간, 스크롤 끊김, 메모리를 재고 정하며, 앨범 아트가 많은 목록은 첫 로드와 캐시 뒤를 따로 잽니다. 선택 상태와 스크롤 위치는 곡 ID로 보존합니다(중앙 wiki의 List Virtualization and Selective Processing).
- **화면 상태.** Compose에서 프로세스가 다시 만들어진 뒤 복원할 화면 상태는 `rememberSaveable`이나 `SavedStateHandle`로 따로 다룹니다(중앙 wiki의 React State Structure and Component Decomposition). 현재 곡, 위치, 대기열은 세션이 소유하므로 화면 state에 복사하지 않고 `MediaController`에서 읽는 것이 같은 원칙의 적용입니다(AI 해석).

wiki에 등록 페이지가 없어 닫지 못한 것: libVLC 운용 경험(장면 자체가 wiki에 없습니다), 곡 사이 끊김 없는 재생, 오디오 포커스와 이어폰 분리 처리, Android Room 저장 구조 변경 사례.

## 장면에서 이어 쓸 것

저장소 안의 장면 문서에 이미 있는 처리입니다.

- 재생 위치 저장: 파일을 여는 중의 초기 시간이나 이전 위치 이벤트로 저장된 기록을 덮어쓰지 않습니다([장면 재생 위치 이동 처리](../../video/docs/research.md#재생-위치-이동-처리)).
- 덮어 설치: 같은 앱 식별자와 서명 키의 APK를 `install -r`로 설치하고, 거절되면 앱 삭제로 우회하지 않습니다([장면 QA](../../video/docs/qa.md)).

## 화면 레퍼런스

[오늘의레퍼런스](../../today-ref/README.md)의 `2026-11-28-music` 주제에 음악 플레이어 완성작 "속지"가 있습니다. Apple Music, Spotify, 지니뮤직, 멜론의 화면을 모아 미니 플레이어, 재생 화면, 대기열, 가사를 만들었고 같은 날 사용자가 "이대로 확정"했습니다. 웹 시안이므로 실제 휴대폰 터치와 동작 속도는 확인하지 않았습니다.

## 확인하지 못한 것

- 실제 휴대폰의 Android 17에서의 백그라운드 재생(가상 기기에서는 통과)
- FFmpeg 확장의 ALAC 재생, 실제 휴대폰 디코더의 Opus 곡 사이 처리(가상 기기의 `c2.android.opus.decoder` 결과만 있습니다)
- 사용자 음악 파일의 휴대폰 재생(가상 기기에서는 12곡 사본이 재생됐습니다), 휴대폰에서 음악이 있는 폴더와 이 12곡 밖의 음악 유무
- 테스트 기기의 현재 Android 버전과 Android 17 적용 여부
- Windows와 macOS 버전의 재생 기술
- 실제 휴대폰에서의 재생, 백그라운드 유지, 업데이트 후 데이터 보존(가상 기기 결과만 있습니다)
