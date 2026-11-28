# 갤러리 앱 기술 조사

조사일: 2026-11-28

Android 사진 갤러리 앱 착수 전에 중앙 wiki와 웹 문서로 조사한 결과입니다. 앱의 목표와 할 일은 [범위](scope.md)에 있습니다. 이 문서의 내용은 문서 조사이며, 미디어 관리 권한만 Android 14와 17 가상 기기에서 실험했습니다([검증 기록](verification.md)). 실제 휴대폰에서 확인한 것은 없습니다.

## 결정

2026-11-28 사용자 결정. 질문마다 권장안을 골랐습니다: 최소 버전 "Android 14 (권장)", 영상 재생 "앱 안 Media3 (권장)", 확인 창 "미디어 관리 권한 (권장)". 첫 버전에서 뺄 기능은 "장소 이름, 주제 검색, 추억"입니다. 미디어 관리 권한은 아래 [최소 실험](#착수-전-최소-실험)을 통과해야 확정합니다. 2026-11-28 Android 17과 14 가상 기기에서 네 단계를 통과했고, 사진 읽기가 전체 허용일 때만 확인 창이 생략된다는 조건이 더해졌습니다. 실제 휴대폰은 미검증입니다.

### 개발 스택

| 부분 | 선택 | 상태 |
|---|---|---|
| 플랫폼 | Android 먼저 | 사용자 결정([범위](scope.md)) |
| 최소 Android 버전 | Android 14(API 34) | 사용자 결정. 테스트 휴대폰 두 대(갤럭시 S25, A16)가 출시 때부터 Android 14 이상이라 실제 기기로 모든 분기를 확인할 수 있습니다. 두 기기에 설치된 버전은 미확인입니다 |
| 사진 목록 | MediaStore에서 사진과 영상을 읽음. 권한은 `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`를 한 번에 요청 | 권장안에 포함돼 채택. 장면처럼 시스템 파일 선택기로 고르는 방식은 기기 사진 전체를 보여 주는 첫 화면에 맞지 않습니다 |
| 영상 재생 | 앱 안에서 Media3 ExoPlayer, 안정판 1.11.1([출시 기록](https://developer.android.com/jetpack/androidx/releases/media3)) | 사용자 결정. 사진 보기 안에서만 재생하고 화면을 떠나면 멈추므로 Android 17 백그라운드 오디오 제한은 해당하지 않습니다 |
| 휴지통과 즐겨찾기 | MediaStore의 `createTrashRequest`, `createFavoriteRequest`. 영구 삭제는 최근 삭제됨에서만 `createDeleteRequest` | 권장안에 포함돼 채택. 즐겨찾기는 기기의 미디어 정보(`IS_FAVORITE`)에 저장해 다른 갤러리와 공유되고 앱을 지워도 남습니다 |
| 확인 창 | 미디어 관리 권한(`MANAGE_MEDIA`)을 처음 한 번 설정에서 켜도록 안내. `READ_EXTERNAL_STORAGE`는 선언하지 않음. 미디어 관리가 켜져 있고 사진과 영상 읽기가 전체 허용일 때만 확인 창 없이 처리하고, 그 밖에는 매번 확인 창 | 사용자가 권장안으로 조건부 채택. Android 14와 17 가상 기기 실험 통과([검증 기록](verification.md)), 실제 휴대폰은 미검증. 시안의 5초 실행 취소는 확인 창 없이 처리할 때만 둡니다. 부분 허용에서는 미디어 관리를 켜도 휴지통과 되돌리기에 확인 창이 떴습니다. 갑작스러운 재시작 뒤 권한이 꺼진 일이 있어 화면에 돌아올 때마다 다시 확인합니다 |
| 앱 앨범 | Room. 앨범마다 MediaStore 항목 ID를 저장 | AI 제안, 사용자 미확정. 미디어 정보가 다시 만들어지면 ID가 바뀔 수 있으므로 상대 경로, 파일 이름, 크기, 촬영 시각을 함께 저장해 다시 찾습니다 |
| 이미지 로더 | 격자 썸네일은 이미지 로더 없이 `ContentResolver.loadThumbnail`로 시스템 썸네일을 받고 앱은 메모리 캐시와 취소만 맡음 | 2026-11-28 사용자 결정("직접 로더"). 새 의존성이 없고, 최신 Coil 3.6.3([변경 기록](https://coil-kt.github.io/coil/changelog/))은 Compose 1.12 기준이라 지금 빌드의 Compose 1.9와 맞는지 확인이 필요했습니다. 사진 보기의 확대(Telephoto)를 넣을 때 Coil을 다시 판단합니다. 아래는 처음 제안 때의 근거입니다. Glide의 Compose 연동은 1.0.0-beta11로 아직 베타입니다([Glide 5.0.10](https://github.com/bumptech/glide/releases/tag/v5.0.10)). 시스템 썸네일은 사진과 영상을 같은 경로로 받으므로 Coil 영상 썸네일 누락 보고를 피할 수 있는지 실기로 비교합니다 |
| 사진 확대 | Telephoto `zoomable-image-coil3` 0.19.0([문서](https://saket.github.io/telephoto/zoomableimage/)) | AI 제안, 사용자 미확정. 큰 사진을 나눠 읽고 두 번 눌러 확대, 끌어 옮기기를 지원합니다. Coil 3에서 나눠 읽지 못하는 GIF, AVIF, SVG의 캐시를 닫지 않는 미해결 이슈가 있습니다([#181](https://github.com/saket/telephoto/issues/181)) |
| 사진 정보 | `androidx.exifinterface`로 촬영 정보를 읽기만 함 | AI 제안, 사용자 미확정. 장소 이름을 뺐으므로 첫 버전은 위치 줄을 숨기고 `ACCESS_MEDIA_LOCATION`을 요청하지 않습니다 |
| 목록 처리 | 사진 ID, 날짜, 형식, 크기만 한 번에 메모리로 읽고 Paging은 쓰지 않음. 화면에 돌아올 때와 미디어 변경 알림 때 다시 읽음 | AI 제안, 사용자 미확정. 실제 사진 수에서 첫 화면 시간과 메모리를 재고 병목이 보일 때 나눠 읽기를 검토합니다 |
| 언어와 화면 | Kotlin, Jetpack Compose | AI 제안, 사용자 미확정. [장면](../../video/README.md)과 같은 조합이라 빌드 구성과 검사 방식을 맞출 수 있습니다 |
| 빌드 | `apps/gallery` 안의 별도 Gradle 빌드. compileSdk와 targetSdk 36에서 시작 | AI 제안, 사용자 미확정. Coil 3.6은 Compose 1.12에 맞춰 나왔으므로, 장면의 Compose BOM(2025.10.01)과 Kotlin 2.2.21을 그대로 쓸 수 있는지 빌드 구성 때 확인합니다 |
| 앱 식별자 | `dev.forme.gallery` | 2026-11-28 사용자 결정("dev.forme.gallery로"). 출시 뒤 바꾸지 않습니다 |

### 착수 전 최소 실험

미디어 관리 권한은 운영체제 기능에 기대므로 화면을 만들기 전에 작은 실험 앱으로 확인합니다([작업 규칙](../../../AGENTS.md)).

1. Android 14 이상에서 `READ_MEDIA_IMAGES`와 `READ_MEDIA_VIDEO`만 허용하고(`READ_EXTERNAL_STORAGE` 없이) 설정에서 미디어 관리를 켜면 `MediaStore.canManageMedia()`가 참이 되는지 확인합니다. 공식 문서는 `READ_EXTERNAL_STORAGE`를 함께 선언하라고 적었고, Android 13 이상에서 대신 어떤 권한이 필요한지는 문서로 확인하지 못했습니다.
2. 그 상태에서 휴지통, 되돌리기, 즐겨찾기 요청이 확인 창 없이 끝나는지, 부분 허용 상태에서는 어떻게 되는지 봅니다.
3. 권한이 없을 때 확인 창에서 취소하면 아무것도 바뀌지 않고 화면도 그대로인지 봅니다.
4. 휴지통에 넣은 항목이 최근 삭제됨 목록 조회(`QUERY_ARG_MATCH_TRASHED`)에 나오는지 봅니다.

실패하는 경로(권한 없음, 취소, 요청 2000개 초과, 항목이 이미 사라짐)는 자동 검사에 넣습니다. 1번이 실패하면 시안의 5초 실행 취소를 빼고 매번 확인 창 방식으로 바꿉니다.

결과(2026-11-28, Android 17 가상 기기, [검증 기록](verification.md#2026-11-28-미디어-관리-권한-가상-기기-최소-실험)): 1, 3, 4번은 통과했습니다. 2번은 전체 허용에서만 통과했고, 부분 허용에서는 미디어 관리를 켜도 휴지통과 되돌리기에 확인 창이 떴습니다. 즐겨찾기는 미디어 관리 권한 없이도 확인 창이 뜨지 않았습니다. `canManageMedia()`는 읽기 권한을 회수해도 참으로 남으므로, 확인 창 생략 여부는 이 값과 읽기 권한을 함께 봐야 합니다. Android 14 이미지가 없어 최소 버전에서는 시험하지 못했습니다.

후속(2026-11-28, Android 14 가상 기기, [검증 기록](verification.md#2026-11-28-android-14-가상-기기-재실험)): 같은 결과였습니다. 즐겨찾기는 읽기 권한과 미디어 관리 권한이 모두 없어도 확인 창 없이 바뀌었습니다. 버전 번호를 올린 업데이트와 정상 재시작 뒤에는 미디어 관리 권한이 유지됐고, `adb reboot` 뒤에는 꺼져 있었습니다.

## 사진과 영상 읽기 권한

[부분 접근 공식 문서](https://developer.android.com/about/versions/14/changes/partial-photo-video-access), [공유 저장소 미디어 접근](https://developer.android.com/training/data-storage/shared/media)

- Android 13(API 33)부터 사진은 `READ_MEDIA_IMAGES`, 영상은 `READ_MEDIA_VIDEO`로 읽습니다. 둘 다 요청해야 사용자가 사진과 영상을 함께 고를 수 있습니다.
- Android 14(API 34)부터 사용자는 "선택한 사진과 동영상만" 허용할 수 있습니다. 앱이 직접 갤러리를 그리면 `READ_MEDIA_VISUAL_USER_SELECTED`를 같은 요청에 넣습니다.
- 이 권한을 요청하지 않은 앱은 호환 모드로 동작합니다. 이때 `READ_MEDIA_IMAGES`와 `READ_MEDIA_VIDEO`가 허용된 것으로 보이지만 실제로는 고른 항목만 보입니다. 이 가짜 허용은 앱이 백그라운드로 갈 때까지 유지됩니다.
- 접근 단계 판정: `READ_MEDIA_IMAGES`나 `READ_MEDIA_VIDEO`가 허용되어 있으면 전체 접근입니다. 둘 다 거부되어 있는데 `READ_MEDIA_VISUAL_USER_SELECTED`가 허용되어 있으면 부분 접근입니다.
- 권한 상태는 앱을 닫지 않고도 설정에서 바뀝니다. `onStart`와 `onResume` 사이에도 바뀔 수 있으므로 저장해 두지 않고, 화면에 돌아올 때마다 `checkSelfPermission`으로 다시 확인합니다.
- MediaStore 조회 결과도 저장한 캐시가 아니라 `ContentResolver`로 매번 읽고, 앱이 보이는 동안만 메모리에 두며, `onResume`에서 새로 고칩니다.
- 부분 접근이면 목록이 비어 있다고 판단하지 않고, 사진을 더 허용하는 경로를 보여 줍니다. 고른 항목의 접근은 시간이 지나면 만료될 수 있습니다.
- Android 15는 가장 최근에 고른 항목만 보여 주는 `QUERY_ARG_LATEST_SELECTION_ONLY` 조회 옵션을 추가했습니다. Android 16(대상 SDK 36)은 부분 접근 선택기에서 앱이 만든 사진을 미리 선택해 둡니다.
- 위치 정보(EXIF의 GPS)를 읽으려면 `ACCESS_MEDIA_LOCATION`이 따로 필요합니다. 권한 창이 여러 번 뜨지 않도록 위 권한과 한 번에 요청합니다.

## Google Play 사진 권한 정책

[Play Console 도움말](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en), [Android 개발자 블로그(2025-04)](https://android-developers.googleblog.com/2025/04/google-play-empowering-developers-to-build-user-trust-through-privacy.html)

- 직접 설치해 쓰는 동안에는 적용되지 않습니다. Play에 올릴 때만 해당합니다.
- 대상 SDK 33 이상 앱은 시스템 사진 선택기로 핵심 기능을 할 수 없을 때만 `READ_MEDIA_IMAGES`와 `READ_MEDIA_VIDEO`를 쓸 수 있습니다. 2025-05-28부터 의무입니다.
- 갤러리와 사진 관리 앱은 허용 대상의 대표 예입니다. Play Console에 권한 사용 신고서를 냅니다.
- `READ_MEDIA_VISUAL_USER_SELECTED`도 두 권한을 함께 선언하므로 정책을 피하는 수단이 아닙니다.

## 삭제와 휴지통

[MediaStore API 문서](https://developer.android.com/reference/android/provider/MediaStore)

- Android 11(API 30)부터 `createTrashRequest`, `createDeleteRequest`, `createWriteRequest`, `createFavoriteRequest`가 확인 창을 띄우는 `PendingIntent`를 돌려줍니다. 앱이 직접 지우지 않고 사용자가 시스템 창에서 승인합니다.
- `createTrashRequest`는 `IS_TRASHED`를 바꿉니다. `false`를 넘기면 휴지통에서 되돌립니다. 휴지통 항목은 시스템이 정한 기간 뒤에 영구 삭제됩니다.
- `createDeleteRequest`는 바로 영구 삭제합니다. [작업 규칙](../../../AGENTS.md)의 원본 보존에 맞춰 기본 삭제는 휴지통 요청으로 하고, 영구 삭제는 사용자가 휴지통에서 고를 때만 둡니다(AI 해석, 사용자 미확정).
- 결과는 `ActivityResultContracts.StartIntentSenderForResult`로 받습니다. `RESULT_OK`가 돌아올 때는 작업이 이미 끝난 상태입니다. 취소하면 아무것도 바뀌지 않으므로 화면에서 미리 지운 것처럼 보이지 않게 합니다.
- 주소는 MediaStore의 항목 주소(`_ID` 포함)여야 합니다. 대상 SDK가 36 이상이면 요청 한 번에 최대 2000개이고, 넘으면 `IllegalArgumentException`이 납니다.
- `MANAGE_MEDIA`(API 31 이상) 권한을 사용자가 허용하면 확인 창 없이 처리됩니다. 이 경우에도 같은 요청 함수를 호출하며, 설정 화면(`ACTION_REQUEST_MANAGE_MEDIA`)에서 사용자가 직접 허용해야 합니다. Android 14와 17 가상 기기에서는 사진 읽기를 전체 허용했을 때만 확인 창이 생략됐습니다([검증 기록](verification.md)). 즐겨찾기 요청은 두 버전 모두 권한과 관계없이 확인 창이 뜨지 않았습니다.
- Android 10(API 29)은 이 함수가 없고, 다른 앱이 만든 파일을 지우면 `RecoverableSecurityException`이 나서 파일마다 동의를 받습니다. 이 동작은 검색 결과에서 확인하지 못한 일반 지식이므로 착수 시 공식 문서로 다시 확인합니다. 최소 Android 버전을 11로 두면 이 분기를 피할 수 있습니다.

## 사진 목록과 썸네일 성능

- 고정된 사진 수 기준으로 가상화나 최적화를 정하지 않습니다. 실제 기기에서 첫 화면 시간, 스크롤 끊김, 메모리를 먼저 재고 병목에 맞는 가장 좁은 수단을 고릅니다. 선택 상태와 스크롤 위치는 화면에서 사라질 수 있는 칸 안에 두지 않고 사진 ID로 보존합니다(중앙 wiki의 List Virtualization and Selective Processing).
- Compose의 `LazyVerticalGrid`와 Coil에서 스크롤이 끊긴다는 보고에 관리자는 디버그 빌드가 아니라 릴리스 빌드로 측정하라고 답했습니다([coil #1610](https://github.com/coil-kt/coil/issues/1610), [coil #2584](https://github.com/coil-kt/coil/issues/2584)). 두 번째 보고에서는 처음 불러올 때 메인 스레드 시간이 크고 캐시된 뒤에는 빨라졌습니다.
- Coil 3.1.0에서 빠르게 스크롤하면 영상 썸네일이 뜨지 않는다는 보고가 있습니다([coil #2953](https://github.com/coil-kt/coil/issues/2953)). 같은 조건에서 Glide는 괜찮았다고 합니다. 영상 썸네일은 이미지 로더를 정할 때 실제 기기로 비교합니다.
- MediaStore의 `loadThumbnail`과 이미지 로더를 함께 쓴 성능 근거는 이번 검색에서 찾지 못했습니다.

## Android 17

[Android 17 발표](https://developer.android.com/blog/posts/android-17-is-here?hl=en)

- 사진과 영상 권한의 변경은 찾지 못했습니다. 시스템 사진 선택기가 썸네일을 세로 비율로 보여 주는 `PhotoPickerUiCustomizationParams`가 추가됐습니다.
- 갤러리에서 영상을 재생하면서 다른 앱으로 가는 기능을 넣는다면, Android 17의 백그라운드 오디오 제한을 함께 봅니다([음악 앱 기술 조사](../../music/docs/research.md#android-17의-백그라운드-오디오-제한)).

## 참고할 오픈소스 갤러리

- **Fossify Gallery**([F-Droid](https://f-droid.org/packages/org.fossify.gallery/)): Simple Gallery가 2023년 12월 ZipoApps에 팔린 뒤 광고가 붙고 소스가 닫히자, 커뮤니티가 그 이전 코드로 만든 앱입니다. GPL-3.0이고 광고와 네트워크 권한이 없습니다. 자르기와 회전 같은 편집, EXIF 지우기, 앱 잠금, 휴지통이 있습니다. F-Droid 최신 버전은 2026-11-25의 1.14.3이며 Android 8.0 이상입니다. 광고 붙은 앱을 대체한다는 이 저장소의 목적과 가장 가까운 사례입니다.
- **Aves**([GitHub](https://github.com/deckerst/aves)): Flutter 화면과 Kotlin 네이티브 계층으로 만든 갤러리입니다. BSD-3-Clause입니다. 모션 포토, 파노라마, 360도 영상을 찾고 EXIF, IPTC, XMP를 보여 주며, XMP 제목과 태그를 고칠 수 있습니다. 지도 기능 때문에 네트워크를 씁니다. 한 리뷰 글은 라이선스를 Apache 2.0으로 적었지만 저장소 표기와 다릅니다.

GPL 코드를 가져오면 이 앱도 GPL을 따라야 합니다. 구조와 동작을 참고하는 범위와 코드를 가져오는 범위는 착수 시 정합니다.

## 화면 레퍼런스

[오늘의레퍼런스](../../today-ref/README.md)의 `2026-11-28-gallery-app` 주제에 휴대폰 갤러리 완성작이 있습니다. Apple 사진, Google 포토, Amazon Photos, Ente, Immich와 Dribbble 시안 3개를 모아 만들었고 같은 날 사용자가 확정했습니다. 웹 시안이므로 실제 휴대폰 터치와 동작 속도는 확인하지 않았습니다.

## 출처의 한계

- 웹 검색 결과의 요약을 읽었고, 공식 문서 원문 전체를 열어 본 것은 아닙니다. 구현할 때 해당 API 문서를 다시 확인합니다.
- Coil 성능은 GitHub 이슈의 개별 보고이며 일반적인 결론이 아닙니다.
