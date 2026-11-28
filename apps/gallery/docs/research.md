# 갤러리 앱 기술 조사

조사일: 2026-11-28

Android 사진 갤러리 앱 착수 전에 중앙 wiki와 웹 문서로 조사한 결과입니다. 앱의 목표와 할 일은 [범위](scope.md)에 있습니다. 이 문서의 내용은 모두 문서 조사이며, 실제 기기에서 확인한 것은 없습니다.

## 결정

아직 정하지 않았습니다. 사진 목록을 읽는 방식, 화면 기술과 이미지 로더는 착수할 때 정합니다.

- 권장안(AI 해석, 사용자 미확정): 기기의 사진과 영상 목록은 MediaStore에서 읽고, 삭제는 MediaStore 휴지통 요청으로만 합니다. 화면은 [장면](../../video/README.md)과 같은 Kotlin과 Jetpack Compose로 만들어 빌드 구성과 검사 방식을 맞춥니다.
- 장면처럼 시스템 파일 선택기로 파일이나 폴더를 고르는 방식은 갤러리의 첫 화면(기기 사진 전체)에 맞지 않습니다. 다만 Android 11 이상에서 폴더 선택기로 받을 수 없는 범위가 있다는 장면의 조사 결과는 그대로 유효합니다([장면 기술 조사](../../video/docs/research.md#파일-접근-방식)).

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
- `MANAGE_MEDIA`(API 31 이상) 권한을 사용자가 허용하면 확인 창 없이 처리됩니다. 이 경우에도 같은 요청 함수를 호출하며, 설정 화면(`ACTION_REQUEST_MANAGE_MEDIA`)에서 사용자가 직접 허용해야 합니다.
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
