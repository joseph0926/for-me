# 레퍼런스 묶음

사용자가 선택한 화면과 원본 이미지, 프롬프트 기록을 함께 보관한다. 로컬 MCP의 `list_reference_sets`로 제목, 용도, 플랫폼, 화면 종류와 선택 상태를 먼저 확인한다. 반환된 ID와 버전으로 `get_reference_set`과 `get_reference`를 호출해 묶음 정보와 PNG 원본을 읽는다. 웹 갤러리와 검색 필터는 아직 구현하지 않았다.

| 묶음 | 버전 | 화면 | 선택 상태 |
|---|---|---|---|
| [SCENE — 스트리밍 홈과 플레이어](video-streaming-scene/v1/README.md) | 1 | 홈, 세로 재생, 가로 재생 | 2026-11-17 사용자 선택 |
| [FRAME — 영화 컬렉션 목록](film-collection-frame/v1/README.md) | 1 | 목록형 컬렉션 상세 | 2026-11-17 두 번째 목록형 선택. 다른 화면은 미포함 |
| [서비스 로그 — 장애 조사 화면](service-logs/v1/README.md) | 1 | 데스크톱 로그 대시보드 | 2026-11-17 우선 보관. 완전한 만족이나 최종 승인은 아님 |

각 묶음의 README는 화면과 선택 맥락을, `prompts.md`는 제공한 프롬프트를, `manifest.json`은 식별자와 이미지 파일 정보를 기록한다. 서버는 `manifest.json`과 설명 파일을 읽어 응답을 구성한다. 입력과 응답 형식은 [MCP 조회 계약](../docs/mcp.md), 실제 전달과 구현 활용 범위는 [검증 기록](../docs/verification.md)에 있다.

등록한 버전의 이미지를 교체하지 않는다. 이후 시안은 새 버전으로 보존한다. 원본 파일명은 메타데이터에 남기고 저장소 파일명에는 영문을 사용한다.

## 폴더와 이름

묶음 폴더와 ID는 제품 용도를 먼저 쓰고, 디자인 이름이 있으면 덧붙인다. 등록 순서 번호나 색감, 만족도는 이름에 넣지 않는다. 이미지 ID와 파일명은 묶음 안에서 화면과 필요한 상태를 나타낸다. 서로 다른 묶음에 같은 `home` ID가 있어도 묶음 ID와 버전으로 구별된다.

```text
references/
  video-streaming-scene/v1/
    home.png
    player-portrait.png
    player-landscape.png
  film-collection-frame/v1/
    collection-list.png
  service-logs/v1/
    investigation-selected-request.png
```

각 버전 폴더에는 `manifest.json`, `README.md`, `prompts.md`도 있다. 같은 디자인의 후속 시안은 `v2`처럼 새 버전으로, 구성이 크게 다른 대안은 용도와 구별되는 이름을 가진 별도 묶음으로 보관한다. 이미 공개한 새 ID는 제목이나 취향이 바뀌어도 유지한다.

사람에게 보이는 제목은 `manifest.title`, 용도는 `domain`, 대상 환경은 `platforms`, 화면 종류는 이미지별 `screen`이 소유한다. 플랫폼은 시안의 대상 환경이며 실제 기기에서 검증했다는 뜻은 아니다. 선택 상태와 원문 평가는 `status`와 `selection`에 남긴다.

## 이전 ID 연결

| 이전 묶음 ID | 현재 묶음 ID | 현재 이미지 ID |
|---|---|---|
| `scene-001` | `video-streaming-scene` | `home`, `player-portrait`, `player-landscape` |
| `frame-002` | `film-collection-frame` | `collection-list` |
| `logs-003` | `service-logs` | `investigation-selected-request` |

이전 묶음 ID는 서버의 연결표로, 이전 이미지 ID는 manifest의 이미지별 `aliases`로 연결한다. 예전 요청도 동일 버전의 동일 PNG를 반환한다. 폴더 심볼릭 링크나 중복 이미지 사본을 만들지 않는다. 이전 파일 경로는 이동했으므로 저장소 문서의 링크는 새 경로로 갱신했다. 과거 실행 기록의 ID는 당시 값으로 보존한다.
