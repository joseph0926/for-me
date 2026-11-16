# 기술 조사

조사일: 2026-11-16. 로컬 환경: macOS 27.2.1, arm64, Terminal 2.15(488.9), Swift 6.4.2.

현재 0.2.1은 두 단축키를 시스템에 직접 등록하는 방식을 사용합니다. 아래에는 0.1.0의 선택과 실패, 0.2.0의 방식 변경, 0.2.1의 오류 처리 보완을 순서대로 남깁니다.

## 0.1.0에서 선택한 방식

Swift, AppKit, CoreGraphics, ApplicationServices, Carbon을 사용합니다. 별도 패키지와 메뉴 막대 UI는 없습니다. `CGEvent.tapCreate`의 로그인 세션 이벤트에서 두 조합을 변환하고, `NSWorkspace`와 접근성의 역할 정보로 기본 터미널 입력 영역인지 확인합니다. 사용자 텍스트 속성은 읽지 않습니다.

Command를 먼저 놓는 경우도 있으므로 변환한 방향키의 눌림과 놓임을 연결합니다. 반복 입력, 보조키 조합, 초점 변경을 자동 검사합니다. 실제 키 입력 성공과는 구분합니다.

보안 키보드 입력 중에는 원래 입력을 유지합니다. 권한을 잃으면 이벤트 처리를 해제합니다. 처리 지연으로 macOS가 이벤트 처리를 끄면 재활성화하되, 사용자 입력으로 중지한 경우에는 `off`와 `on`을 기다립니다.

## 자동 실행과 상태

개인용 명령어 도구이므로 사용자 LaunchAgent와 `launchctl`을 사용합니다. 시스템 전체 서비스와 관리자 권한은 사용하지 않습니다. `off`는 `disable`로 다음 실행을 막고 `bootout`으로 현재 등록을 해제합니다. `on`은 `enable`, 필요한 경우 `bootstrap`, `kickstart` 순서입니다.

`launchctl print`의 출력 형식은 안정된 API가 아니므로 텍스트를 파싱하지 않습니다. 등록 여부는 종료 코드로 확인하고, 실제 실행 상태는 앱이 2초마다 쓰는 내용 없는 상태 기록으로 확인합니다. 기록이 8초 이상 오래됐거나 프로세스가 없으면 정상 실행으로 표시하지 않습니다.

앱은 임시 서명을 사용하므로 업데이트 후 권한 유지 여부를 보장하지 않습니다. 정식 배포로 확장하면 Developer ID 서명과 공증, SMAppService 등록을 다시 검토합니다.

## 대안과 경계

기본 키 설정에는 Command를 선택할 수 없다는 사용자의 현장 확인이 있었습니다. Karabiner-Elements는 앱별 적용, 명령어 제어, 보안 키보드 입력 지원이 있는 대안이지만 사용자가 전용 프로그램 제작을 선택했습니다.

위키의 프로젝트와 에이전트 CLI 주제 목록에서는 동일한 키 변환 도구의 은퇴나 낮은 수요 기록을 찾지 못했습니다. 다른 목적의 중단된 도구를 이 앱의 중단 근거로 사용하지 않았습니다.

## 2026-11-16 기존 방식의 중단 기록과 후속 실험

0.1.0의 CGEventTap 방식은 현재 사용 환경에서 채택을 중단합니다. 보안 입력이 켜져 있으면 스스로 변환을 멈추도록 설계했고, 사용자가 체크를 해제해도 다시 활성화되는 현상을 관찰했습니다. `ready`가 잠깐 나타났지만 다시 `secure-input`으로 돌아왔으며 실제 줄 이동 검사도 실패했습니다. 보안 입력이 다시 켜지는 원인은 미확정이고 [QA-001](qa-issues.md#qa-001-보안-키보드-입력이-해제-후-다시-표시됨)은 해결로 판정하지 않습니다.

사용자가 보안 입력을 유지한 채 쓰기를 요청하고, 두 단축키를 macOS에 직접 등록하는 실험을 승인했습니다. 0.2.0 실험은 `RegisterEventHotKey`로 Command 좌우 방향키만 등록하고, 통지를 받으면 해당 Terminal 프로세스에 Control A/E를 보냅니다. 입력 스트림을 감시하는 CGEventTap을 사용하지 않습니다.

등록 조건은 손쉬운 사용 권한, 앞에 있는 기본 터미널, 일반 창의 입력 영역입니다. 앱 전환과 접근성 초점 변경 시 등록을 해제하고, 통지 처리 직전에도 조건을 다시 검사합니다. 단축키 등록, 통지 수신, 키 전송 요청, 실제 커서 이동은 각각 별도 증거로 기록합니다. 실험 시작 당시에는 보안 입력 중 통지와 전송이 가능한지 미검증이었습니다.

후속 실험에서 macOS 27.2.1과 Terminal 2.15의 보안 입력을 켠 상태로 실제 이동을 두 번 확인했습니다. 단축키 통지와 전송 요청은 각각 4회였고, 터미널 검색창과 다른 앱의 검사에서는 횟수가 늘지 않았습니다. 현재 환경의 0.2.0에서는 직접 등록 방식을 채택합니다. 다른 OS와 입력 환경에 대한 보장은 아니며 [검증 기록](verification.md)의 범위를 따릅니다.

## 0.2.1 메뉴 감시와 조회 대기 보완

0.2.0은 메뉴 알림 등록 오류를 무시하고 감시 시작을 성공으로 처리했습니다. 0.2.1은 초점과 창 변경, 메뉴 열기와 닫기 네 알림의 등록이 모두 성공해야 감시를 시작합니다. 하나라도 실패하면 부분 등록을 정리하고 단축키 등록을 막습니다.

접근성 정보는 앱, 입력 요소와 창 객체를 차례로 조회합니다. 0.2.1 구현은 각 속성 조회 직전에 실제 조회 대상 객체에 50ms 제한을 설정하고, 제한 설정 또는 조회가 실패하면 중단합니다. 조회를 마친 뒤에는 앞에 있는 앱이 바뀌지 않았는지 다시 확인합니다. 제한은 호출별이므로 전체 조회가 50ms 안에 끝나거나 앱 전환 즉시 단축키가 해제된다는 보장은 아닙니다.

메뉴 알림 실패와 복구, 부분 등록 정리, 객체별 대기 제한과 오류 처리는 실제 Agent 코드에 오류를 주입한 자동 검사로 확인했습니다. 0.2.1에서 보안 입력 중 줄 이동도 확인했습니다. 메뉴 입력만 분리한 검사는 보류했고 실제 Terminal의 응답 지연 조건은 미검증입니다. [검증 기록](verification.md)과 [QA 이슈](qa-issues.md)에 결과와 한계를 구분합니다.

## 출처

- [Apple Terminal 단축키](https://support.apple.com/en-jo/guide/terminal/trmlshtcts/mac)
- [Apple 키 조합 설정](https://support.apple.com/guide/terminal/create-custom-function-keys-trml108/mac)
- [Apple 보안 키보드 입력](https://support.apple.com/en-bh/guide/terminal/trml109/mac)
- [CGEvent](https://developer.apple.com/documentation/coregraphics/cgevent)
- [접근성 신뢰 확인](https://developer.apple.com/documentation/applicationservices/1459186-axisprocesstrustedwithoptions)
- [SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice)
- 로컬 `man launchctl`, `man launchd.plist`, macOS SDK의 `CarbonEventsCore.h`
- [Karabiner 앱별 조건](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/conditions/frontmost-application/)
- [Karabiner 명령어](https://karabiner-elements.pqrs.org/docs/manual/misc/command-line-interface/)
- [Karabiner 기능](https://karabiner-elements.pqrs.org/docs/getting-started/features/)
