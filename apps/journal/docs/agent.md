# 개발 AI의 기록 계약

기록은 사용자가 앱을 만들고 쓰는 과정을 보존합니다. 개발 권한, Git 쓰기 권한이나 외부 전송 권한을 넓히지 않습니다. 기존 사용자 기록을 지우거나 완료를 추정하지 않습니다.

## 작업 흐름

1. `cli.mjs init` 후 `read`로 앱 ID, 최신 revision과 기존 요청을 확인합니다. 웹과 같은 데이터 경로를 사용합니다.
2. 실제 개발 요청을 `request`로 기록합니다. 사용자 원문은 `originalQuote`, AI의 요약은 `body`에 둡니다. 인용한 문장을 임의로 완성하지 않습니다. 이미 등록된 같은 요청이면 기존 ID를 이어 씁니다.
3. 변경과 중요한 결정은 `change`, 실제 검사와 한계는 `verification`으로 남기고 `parentId`로 요청 또는 변경을 연결합니다.
4. 버전이나 빌드 식별값이 확인되면 `release`로 남깁니다. `releaseState`는 development, built, installed, used 중 실제 확인한 단계입니다. 설치와 만족을 추정하지 않습니다.
5. 사용자 후속 반응은 `followup`으로 연결합니다. 요청의 `stage`를 바꿀 때도 검사와 실사용 범위를 구분합니다. 테스트 통과가 실제 기기 검증을 대신하지 않습니다.
6. 작업 중단은 요청의 stage를 waiting으로 바꾸고 이유를 후속 기록에 남깁니다. 기록 쓰기에 실패하면 실패 사실을 보고하고 사용자의 원문과 실행 결과를 보존합니다. 기록 장애 때문에 승인된 개발 작업을 임의로 취소하지 않습니다.

`origin`은 시작 이유입니다. 기존 앱의 이유를 과거 문서에서 추론했다면 authority를 interpretation으로 둡니다. 사용자 확인을 받은 회고는 작성 시점과 회고라는 사실을 보존합니다. 앱 이름, 폴더와 상태 변경은 `app.update`로 수행합니다.

## 명령

저장소 루트 기준입니다. `read`, `backup`, `export`, `connections`는 읽기 전용입니다. `init`은 파일이 없는 경우에만 네 앱을 초기 등록합니다. 기존 파일이 손상되거나 저장 형식이 다르면 중단합니다.

```sh
node apps/journal/src/cli.mjs init
node apps/journal/src/cli.mjs read
node apps/journal/src/cli.mjs write
```

`write`는 다음 JSON을 표준 입력으로 받습니다. 실제 revision과 고유 요청 ID로 바꿉니다. 명령행 인수에 사용자 원문을 조립하지 말고 구조화한 입력을 파이프로 전달하거나 도구의 stdin 기능을 사용합니다.

```json
{
  "operationId": "unique-request-operation",
  "expectedRevision": 0,
  "actor": "ai",
  "command": "record.create",
  "data": {
    "appId": "video",
    "kind": "request",
    "title": "가로 재생 조작 위치",
    "body": "가로 화면에서 재생 조작을 가운데로 옮기는 요청",
    "originalQuote": "가로로 볼 때 재생 버튼이 왼쪽에 있어서 불편해요. 가운데로 옮겨주세요.",
    "authority": "user",
    "stage": "open",
    "occurredOn": "2026-11-17"
  }
}
```

이 예시는 실제 사용자 기록이 아닙니다. 새 기록의 날짜를 생략하면 UTC 날짜가 들어갑니다. 사용자 경험 날짜는 사용자 시간대에 맞춰 명시하세요. createdAt과 updatedAt은 서버가 UTC 시각으로 기록합니다.

지원 명령:

| command | data |
|---|---|
| record.create | appId, kind, title, body, authority와 선택 항목 |
| record.update | id, patch. 앱 ID와 사용자 원문은 변경 불가 |
| record.trash / record.restore | id |
| app.create | id, name, platform, folder, status |
| app.update | id와 변경할 name, platform, folder, status. 상태 변경 시 reason 필수 |
| backup.restore | snapshot, confirm: restore. 사용자가 복원을 요청한 경우만 |

기록 선택 항목:

- `parentId`: 같은 앱의 기존 기록 ID. 순환 연결은 거부합니다.
- `kind`: use, request, change, verification, release, followup, origin, status.
- `authority`: user(발언과 경험), interpretation(AI 해석과 제안), verified(검사로 확인).
- `stage`: unknown, open, in_progress, waiting, done.
- `originalQuote`, `source`, `details`: 원문과 출처, 앱별 추가 경험. source는 문서 경로나 대화 식별 정보 등이며 자동 실행하지 않습니다.
- `version`, `build`, `device`: 실제 확인한 버전과 빌드 식별값, 기기 및 OS.
- `releaseState`: development, built, installed, used. release 기록의 확인 범위.
- `context`: daily 또는 test. 기본 daily이므로 QA 기록은 test를 명시합니다.
- `minutes`, `count`: 실제 숫자가 있을 때만 입력합니다. `measurement`를 measured 또는 estimate로 지정합니다. 없으면 null과 unknown을 사용합니다.
- `effortMinutes`: 직접 유지보수한 시간. 추정이면 본문에 그 사실을 적습니다.

응답은 저장 revision과 생성되거나 수정된 ID입니다. 응답 유실 시 같은 operationId와 같은 payload를 재전송하면 이전 결과를 돌려줍니다. 다른 내용을 같은 operationId로 보내면 거부합니다. 충돌(409)은 최신 상태와 해당 기록의 변경 이력을 확인하고 합친 뒤 새 operationId와 최신 expectedRevision으로 보냅니다. 무조건 revision만 올려 덮어쓰지 않습니다.

## 기록 읽기와 회고

기간별 기록은 `read`의 occurredOn으로 고릅니다. deleted 기록을 집계에서 빼고 실사용과 테스트, 실측과 추정을 분리합니다. 기록 없음은 미관측입니다. 앱별 목적 달성은 사용자의 평가나 산출물 활용 기록이 있어야 판단합니다.

회고는 근거 기록 ID를 source에 적어 interpretation으로 저장할 수 있습니다. 원문과 검증 결과를 바꾸지 않습니다. 커밋 수, 테스트 수나 실행 횟수만으로 만족, 실사용 성공과 생산성 향상을 단정하지 않습니다.
