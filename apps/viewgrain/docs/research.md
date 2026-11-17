# Viewgrain 자료와 기술 조사

MCP로 이미지를 전달하고, 공개된 생성 지침과 프롬프트를 참고해 우리 시안을 만드는 방향입니다. 아래 조사는 2026-11-17에 확인한 공식 문서와 저장소 원문을 기준으로 합니다.

## MCP 선택

사용자가 고른 이미지를 한 번 전달하는 작업은 이미지 파일과 설명만으로도 가능합니다. Viewgrain은 AI가 쌓인 자료를 검색하고 관련 화면을 가져오는 용도를 포함하므로 MCP를 기본 연결 방식으로 정했습니다.

MCP 도구 응답에는 이미지 자체와 구조화된 설명을 함께 넣을 수 있습니다. 이미지 주소만 전달하는 방식보다 이미지 내용까지 전달됐는지 확인하기 좋습니다. 실제로 이미지가 모델에 전달되는지는 연결할 AI 도구에서 검증합니다. [MCP 도구 규격](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

MCP는 같은 컴퓨터의 프로그램 사이에서 통신하는 `stdio`와 HTTP로 연결하는 방식을 제공합니다. 로컬 운영은 별도 원격 서버 없이 시작할 수 있는 후보입니다. 어떤 방식을 쓸지는 첫 연결 대상과 함께 정합니다. [MCP 통신 규격](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)

갤러리와 MCP는 같은 이미지와 기록을 읽도록 설계합니다. 파일 내보내기를 추가하더라도 원본 자료를 따로 관리하지 않습니다. 제안한 검색과 조회 기능은 [MCP 설계 초안](mcp.md)에 있습니다.

## 최종 자료 후보

세 후보는 역할이 다릅니다. 생성 지침, 디자인을 설명하는 재료, 개별 예제를 나눠 참고합니다. 이후 원문 복제 대신 작성 패턴을 추출해 [프롬프트 활용](prompt-guide.md)에 정리했습니다.

### Leonxlnx imagegen-skills

[저장소](https://github.com/Leonxlnx/imagegen-skills)는 모바일과 웹 화면, 브랜드 시안 등을 이미지로 만드는 지침을 제공합니다. [모바일 화면 지침](https://github.com/Leonxlnx/imagegen-skills/blob/main/skills/imagegen-frontend-mobile/SKILL.md)은 플랫폼 선택, 가독성, 화면 사이의 색상과 구성 일관성을 다룹니다. 사용자 프로젝트인 tastepin과는 별개입니다.

생성 지침의 기본 후보로 추천합니다. 휴대폰 테두리, 강한 질감과 장식, 추가 화면 생성을 선호하는 기본값은 그대로 가져오지 않습니다. 화면만 정면으로 출력하고 생성 장수를 고정하는 등 우리 비교 조건에 맞게 조정할 예정입니다.

라이선스는 [MIT](https://github.com/Leonxlnx/imagegen-skills/blob/main/LICENSE)입니다. 설치하거나 실행하지 않았고, 이 지침의 설명만으로 생성 품질이 검증됐다고 보지 않습니다.

### Superdesign Prompts

[저장소](https://github.com/superdesigndev/superdesign-prompts)는 미리보기와 함께 색상, 글꼴, 배치와 조작 요소를 설명하는 프롬프트를 제공합니다. [음악 재생 화면 예제](https://github.com/superdesigndev/superdesign-prompts/tree/main/prompts/editorial-music-player-now-playing)는 재생 버튼, 탐색 막대와 재생 목록을 구체적으로 지정합니다.

서로 다른 디자인 방향을 만드는 프롬프트 재료로 추천합니다. 일부 항목에는 HTML 구현 예제가 포함되므로, 이미지 생성에 필요한 화면 설명을 추려야 합니다.

[콘텐츠 라이선스](https://github.com/superdesigndev/superdesign-prompts/blob/main/LICENSE-DATA)는 지정된 프롬프트 내용에 CC0를 적용하고, 코드와 구조는 [MIT](https://github.com/superdesigndev/superdesign-prompts/blob/main/LICENSE)로 구분합니다. 미리보기 이미지와 프롬프트가 참조하는 외부 글꼴, 이미지와 라이브러리는 같은 재사용 범위로 묶지 않습니다.

### ZeroLu awesome-gpt-image

[저장소](https://github.com/ZeroLu/awesome-gpt-image)는 사진, 게임, 포스터와 UI를 포함하는 프롬프트와 예제 이미지 모음입니다. UI 전용 생성 프로그램이나 완성된 갤러리 앱은 아닙니다.

직접 확인한 UI 항목의 판단은 다음과 같습니다.

- [Music Player Interface](https://github.com/ZeroLu/awesome-gpt-image#music-player-interface): 이미지에서 가져온 배경색, 어두운 화면의 명암, 재생 버튼과 시간 표시가 구체적입니다. 비디오 플레이어 프롬프트를 설계할 때 가장 먼저 참고할 후보입니다. 음악용 가사와 조작 요소는 영상 재생의 요구로 바꿔야 합니다.
- [E-commerce App Homepage](https://github.com/ZeroLu/awesome-gpt-image#e-commerce-app-homepage): 구역과 필수 요소를 빠짐없이 명시하는 방식이 유용합니다. 정보가 많은 판매 화면이므로 배치와 분위기를 그대로 적용하지 않습니다.
- [Custom Style UI Design System](https://github.com/ZeroLu/awesome-gpt-image#custom-style-ui-design-system): 여러 화면과 컴포넌트를 같은 스타일로 만드는 발상은 참고할 만하지만, 지시문이 포괄적이라 일관성을 확보할 추가 조건이 필요합니다.

확인한 [README](https://github.com/ZeroLu/awesome-gpt-image#license)는 CC BY 4.0을, [LICENSE 파일](https://github.com/ZeroLu/awesome-gpt-image/blob/main/LICENSE)은 MIT를 표시합니다. 개별 예제에도 외부 작성자와 출처가 있습니다. 표기 불일치와 개별 자료의 재사용 조건을 확인하기 전에는 전체 원문과 이미지를 수입할 기반으로 삼지 않고, 출처 링크와 검토 메모를 남기는 참고 자료로 둡니다.

## 보조 자료와 제외한 후보

- [OpenAI 이미지 프롬프트 가이드](https://developers.openai.com/api/docs/guides/image-prompting#create-an-interface-preview): GPT-Image-2.6의 UI 생성 예제를 제공합니다. 화면 구성, 정보 순서와 여백을 구체적으로 지정하는 기준으로 참고합니다.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): 색상, 글꼴과 스타일 검색의 보조 자료입니다. 첫 단계에서는 완성된 화면을 보고 고르는 과정에 집중하므로 핵심 후보에서 제외했습니다.
- [MeiGen AI Design MCP](https://github.com/jau123/MeiGen-AI-Design-MCP): 현재 4.0은 외부 서비스에 연결하는 공개 클라이언트이고 생성에는 구매한 크레딧을 사용합니다. 우리 갤러리를 직접 운영하는 기반으로는 추천하지 않습니다.
- [pyth0nb3st 갤러리](https://github.com/pyth0nb3st/awesome-gpt-image-2/blob/main/LICENSE.md): 코드에는 MIT를 적용하지만, 생성 이미지와 프롬프트 등은 해당 허용에서 제외합니다. 자료 전체를 복제할 후보에서 제외했습니다.

## 비용과 남은 검증

레퍼런스 자료의 공개 여부와 이미지 생성 비용은 별개입니다. API를 통한 GPT-Image-2.6 생성에는 사용량에 따른 비용이 있으며, 이 조사에서 특정 생성 환경이나 결제 사용을 정하지 않았습니다. [모델 안내와 요금](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare)

원문 조사 당시에는 후보를 설치하거나 시안을 생성하지 않았습니다. 이후 사용자가 직접 생성하고 선택한 [SCENE 세 화면](../references/scene-001/v1/README.md)을 첫 묶음으로 보관했습니다. 실제 생성 모델과 입력 전문은 미확인입니다. 한국어 가독성과 실제 구현에 미치는 효과는 [검증 계획](verification.md)에 따라 별도로 확인합니다.

## 2026-11-17 MCP 구현 조사 반영

조사 대상 기간은 2026-09-01부터 2026-11-17까지입니다. 현행 이미지 응답 설명에는 2026-07-28 규격을 보조 근거로 사용했습니다.

- [TypeScript SDK v2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2.4.0)은 10월 23일 릴리스입니다. 구현 시 npm에서 서버 2.4.0 배포와 Node.js 20 이상 요구를 재확인했습니다. 공식 서버를 실행 의존성으로, 공식 클라이언트를 검사 의존성으로 설치했습니다. SDK가 제공하는 JSON Schema 변환을 사용해 별도 스키마 라이브러리를 직접 추가하지 않았습니다.
- [이미지 응답 규격](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#image-content)은 실제 이미지 바이트를 지원합니다. [9월 21일 비교 실험](https://github.com/openai/codex/issues/46927#issuecomment-5764329146)은 같은 응답이 CLI와 웹에서 다르게 처리됐다는 사용자 보고입니다. 이 사례를 현재 모든 웹 연결의 장애로 일반화하지 않습니다.
- [공식 Codex 연결 문서](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)에 따라 로컬 stdio로 먼저 검사했습니다. 호스팅 없이 실행할 수 있으며 AI 이용 비용은 별개입니다. 로컬 설정이 현재 웹 대화의 도구로 자동 등록되는 것은 아닙니다.
- SCENE 세 장의 원본 합계는 5,579,988바이트이고 base64로 약 7.1 MiB입니다. 묶음 조회와 이미지 조회를 분리했습니다. [Python SDK v2.3.0](https://github.com/modelcontextprotocol/python-sdk/releases/tag/v2.3.0)의 10월 2일 큰 응답 수신 옵션은 해당 SDK의 HTTP SSE 경로에 관한 것으로 MCP 공통 한도로 적용하지 않습니다.
- [10월 14일 채택된 릴리스 정책](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/3398-release-cycle-updates.md)은 반기 주기와 2027년 3월 전환 목표를 제시합니다. 이미지 조회를 위해 다음 규격을 기다릴 이유는 확인하지 못했습니다.
- [Inspector 2.15.0](https://github.com/modelcontextprotocol/inspector/releases/tag/2.15.0)은 11월 12일 릴리스입니다. 이번 구현은 별도 Inspector 설치 없이 공식 클라이언트와 실제 Codex CLI로 검사했습니다.

실제 설치와 이미지 전달의 결과는 [검증 기록](verification.md)이 소유합니다. 조사에서 제안한 구조와 실제 성공한 소비 환경을 구분합니다.
