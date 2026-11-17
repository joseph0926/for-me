# Viewgrain

내가 고른 UI 레퍼런스를 AI에게 전달하는 갤러리입니다. UI는 앱에서 보는 화면과 조작 요소를 뜻합니다. 이름은 뷰그레인으로 읽고, 프로젝트 식별자는 `viewgrain`을 씁니다.

생성한 화면을 비교해 고르고, 좋아한 부분과 구현할 때 유지할 특징을 함께 저장합니다. 현재 AI는 MCP(Model Context Protocol)를 통해 지정한 묶음의 이미지와 설명을 가져옵니다. 갤러리 검색은 후속 기능입니다. MCP는 AI 도구가 외부 프로그램의 기능과 자료를 이용하는 연결 규격입니다.

## 현재 상태

2026-11-17에 문서화를 시작했습니다. [SCENE 묶음](references/scene-001/v1/README.md)에 홈과 세로 및 가로 재생 세 장을, [FRAME 묶음](references/frame-002/v1/README.md)에 선택한 목록형 컬렉션 상세 한 장을 보관했습니다. 로컬에서 묶음 정보와 이미지 한 장을 읽는 MCP 서버를 구현했습니다. 갤러리 화면과 검색은 아직 없습니다. 검증 범위는 [실행 기록](docs/verification.md)에 남깁니다.

SCENE과 FRAME의 네 이미지를 실제 MCP로 읽어 [동영상 앱 리디자인](../video/docs/scope.md#2026-11-17-화면-리디자인)에 사용했습니다. 구현에서는 이후 사용자 요청에 따라 가로 재생 조작을 가운데로 옮겼습니다. 레퍼런스 원본은 그대로 보존하며, 구현에 사용했다는 사실을 사용자 만족이나 모든 기기의 검증 완료로 표시하지 않습니다.

첫 탐색 주제는 비디오 앱의 영상 탐색과 재생 경험입니다. 기존 [동영상 앱](../video/README.md)의 구현 범위와 독립적으로 가장 매력적인 레퍼런스를 찾습니다. GPT-Image-2.6으로 시안을 만들고 선택한 결과를 쌓는 방향이며, 생성 도구를 갤러리에 직접 연결할지와 구체적인 모델 설정은 미정입니다.

유료 레퍼런스 서비스 구독을 필수로 두지 않습니다. 이미지 생성 비용과 이용 한도는 별도로 정합니다.

## 문서

- [범위와 결정](docs/scope.md): 만들게 된 이유, 확정한 방향과 첫 버전 범위 제안
- [자료와 기술 조사](docs/research.md): MCP 선택 근거, 공개 프롬프트 후보와 라이선스 확인 결과
- [MCP 조회 계약](docs/mcp.md): 구현한 조회 도구, 응답과 실패 처리 및 후속 검색 제안
- [비디오 앱 레퍼런스 탐색 방향](docs/video-reference.md): 기존 앱의 제약 없이 원하는 화면을 찾는 기준
- [프롬프트 활용](docs/prompt-guide.md): 새 방향 탐색, 다른 화면으로 확장, 사용자 반응에 따른 수정과 기록
- [레퍼런스 목록](references/README.md): 선택한 이미지 묶음과 프롬프트, 선택 기록
- [검증 계획과 기록](docs/verification.md): 원하는 모습이 구현에 반영되는지 확인할 기준
- [QA 이슈](docs/qa-issues.md): 보고된 결함의 최초 재현과 수정 후 검사 결과

## 로컬 실행과 검사

Node.js 24 이상과 Corepack을 사용합니다. 검사 환경은 Node.js 24.22.2, pnpm 12.16.1입니다. 공식 TypeScript SDK를 빌드가 필요 없는 JavaScript 모듈에서 사용합니다. 의존성과 잠금 파일은 이 앱 폴더가 소유합니다.

```sh
cd apps/viewgrain
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm test
node src/server.mjs
```

서버는 표준 입출력으로 MCP 클라이언트와 통신하므로 직접 실행하면 입력을 기다립니다. AI 앱에 등록할 때는 실행할 Node.js와 `src/server.mjs`의 절대 경로를 지정합니다. 작업 디렉터리가 달라도 서버 파일을 기준으로 레퍼런스를 찾습니다.

Codex 설정 예시입니다. 아래 예시는 설정 파일을 자동으로 변경하지 않습니다. `command`는 `asdf which node`로 확인한 경로를 사용하고 `args`는 이 사본의 절대 경로로 바꿉니다.

```toml
[mcp_servers.viewgrain]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/for-me/apps/viewgrain/src/server.mjs"]
```

첫 요청은 `get_reference_set({"set_id":"scene-001","version":1})`입니다. 반환된 화면 ID로 `get_reference`를 호출합니다. 다른 등록 묶음은 `frame-002`, 버전 `1`입니다. 자세한 입력은 [조회 계약](docs/mcp.md)에 있습니다.

공통 작업 순서는 [개발 절차](../../docs/development.md)를 따릅니다.
