# for-me

## 목적

평소 사용하는 앱을 직접 만들고, 쓰고, 유지보수하는 개인 프로젝트입니다.

음악 앱과 동영상 앱처럼 일상에서 쓰는 앱이 대상입니다. 특히 광고가 붙은 앱 중 직접 대체할 수 있는 것을 후보로 삼습니다.

## 앱

앱마다 `apps/<앱>/` 폴더에 문서, 코드와 빌드 설정을 둡니다. 앱마다 언어와 빌드 도구가 다를 수 있어 저장소 루트에는 어느 앱의 빌드 파일도 두지 않습니다.

| 앱 | 폴더 | 대상 | 상태 |
|---|---|---|---|
| [동영상 앱](apps/video/README.md) | `apps/video` | Android, 이후 Windows와 macOS | 개발 중. Android 시제품, 실제 기기에서의 재생은 미검증 |
| [화면 녹화 GIF 생성기](apps/screen-gif/README.md) | `apps/screen-gif` | Windows, 이후 macOS | 개발 중. Windows 시제품 1차 완료(영역 녹화와 저장 확인), 자르기와 품질 모드는 구현 전 |
| [TermKeys](apps/termkeys/README.md) | `apps/termkeys` | macOS | 개발 중. 0.2.1에서 보안 입력 중 줄 이동 확인. 메뉴 입력 제외와 실제 응답 지연 조건은 미검증 |
| [Viewgrain](apps/viewgrain/README.md) | `apps/viewgrain` | 웹 갤러리와 MCP | 레퍼런스 두 묶음에 선택 화면 네 장 보관. 갤러리와 MCP는 설계 단계 |

## 개발

모든 앱에 공통인 절차와 규칙입니다. 앱별 개발 환경, 검사 명령과 기록은 각 앱의 README에 있습니다.

- [개발 절차](docs/development.md): 저장소 구성, 앱 추가 방법, Windows와 macOS 공통 규칙
- [QA 절차](docs/qa.md)
- [작업 규칙](AGENTS.md)
- [Git 규칙](.docs/git-convention.md)

## 제외 대상

쿠팡플레이와 유튜브처럼 콘텐츠를 직접 확보할 수 없어 대체하기 어려운 서비스는 제외합니다.
