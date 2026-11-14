# 동영상 앱 QA

공통 절차는 [QA 절차](../../../docs/qa.md)를 따릅니다. 이 문서는 동영상 앱의 조작 도구와 확인 항목을 다룹니다.

## 실행 전

- 대상 기기의 식별자, 모델, Android 버전과 가상 기기 여부를 확인합니다. 연결된 기기가 여러 개면 ADB 명령마다 대상을 지정합니다.
- 검사할 APK의 SHA-256을 기록합니다.
- 샘플의 식별값, 파일 형식, 영상과 음성 압축 방식, 자막, 길이와 해상도를 기록합니다. 도구가 있으면 `ffprobe`로 확인합니다.
- 증거 폴더는 `apps/video/android/build/reports/qa/<시각>/`에 만듭니다. 예: `apps/video/android/build/reports/qa/20261114-173000/`.
- 영상과 자막 원본을 변경하지 않습니다. 기존 재생 기록과 파일 접근 권한을 보존해야 하는 검사는 앱 삭제나 데이터 초기화 없이 진행합니다.

## 조작 방법

Android QA는 ADB를 기본으로 사용합니다. ADB는 개발 머신에서 가상 기기나 Android 기기에 명령을 보내는 도구입니다. Android Studio는 빌드, 기기 실행과 화면 확인에 사용합니다.

화면 요소는 `uiautomator dump`로 가져오고, 실제 표시는 `screencap`으로 확인합니다. 회전이나 파일 선택기 전환 후에는 좌표를 다시 구합니다.

재생 버튼을 누른 직후 정해진 시간만 기다리고 성공으로 처리하지 않습니다. 재생 준비, 시간 진행과 영상 변화를 확인한 뒤 다음 조작으로 넘어갑니다. 이른 일시정지처럼 준비 중 조작을 검사하려는 경우에는 그 조건을 따로 남깁니다.

### ADB 명령 예시

다음은 macOS에서 SDK가 기본 경로에 있는 경우의 예시입니다. Windows에서는 Git Bash에서 첫 줄만 `ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"`로 바꿔 실행합니다. PowerShell에서는 `screencap` 출력이 깨지므로 이 예시를 쓰지 않습니다. 기기 식별자는 `devices -l` 결과에서 고르고, 증거 경로는 실행마다 새로 정합니다. 아래 기기와 경로를 그대로 반복 사용하지 않습니다.

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" devices -l
QA_SERIAL="emulator-5554"
QA_DIR="apps/video/android/build/reports/qa/20261114-173000"
mkdir -p "$QA_DIR"

"$ADB" -s "$QA_SERIAL" shell getprop ro.build.version.release
"$ADB" -s "$QA_SERIAL" shell getprop ro.build.version.sdk
"$ADB" -s "$QA_SERIAL" shell wm size
"$ADB" -s "$QA_SERIAL" shell pm path dev.forme.video

"$ADB" -s "$QA_SERIAL" shell uiautomator dump /sdcard/for-me-qa.xml
"$ADB" -s "$QA_SERIAL" pull /sdcard/for-me-qa.xml "$QA_DIR/01-before.xml"
"$ADB" -s "$QA_SERIAL" exec-out screencap -p > "$QA_DIR/01-before.png"
```

현재 화면 요소에서 확인한 좌표를 `shell input tap X Y`에 전달합니다.

`shell input keyevent 4`는 뒤로 가기, `shell input keyevent 3`은 홈으로 이동합니다. 강제 종료를 검사할 때는 `shell am force-stop dev.forme.video`, 다시 실행할 때는 `shell am start -W -n dev.forme.video/.MainActivity`를 사용합니다. 종료 방법마다 저장 시점이 다를 수 있으므로 일반 닫기와 강제 종료를 구분해 기록합니다.

화면 회전은 먼저 `shell cmd window user-rotation`으로 현재 설정을 기록합니다. `shell cmd window user-rotation lock 1`은 가로, `lock 0`은 세로 방향을 고정합니다. 검사 후에는 기록한 설정을 복원합니다. 기존 설정이 `free`인 경우에만 `shell cmd window user-rotation free`로 되돌립니다.

덮어 설치는 같은 앱 식별자와 서명 키를 가진 APK에 `install -r`을 사용합니다. 테스트 전용 APK로 확인되거나 `INSTALL_FAILED_TEST_ONLY`가 나오면 `install -r -t`를 사용합니다. 서명이나 버전 문제로 설치가 거절되면 원인을 기록하고, 앱 삭제로 우회하지 않습니다.

## 확인 항목

- 파일 선택과 취소: 시스템 선택기로 샘플을 열고, 취소 시 기존 화면과 기록이 유지되는지 확인합니다.
- 재생과 조작: 시간과 영상의 변화를 확인하고, 일시정지 동안 위치와 장면이 유지되는지 본 뒤 재개와 위치 이동을 확인합니다. 소리는 실제로 듣거나 출력 증거를 확보한 경우만 통과로 기록합니다.
- 화면 전환: 재생 중과 일시정지 상태를 각각 회전하고, 홈으로 이동했다 복귀합니다. 장면, 위치, 길이, 재생 의도와 조작 가능 상태를 확인합니다.
- 이어보기: 위치를 기록한 뒤 영상을 닫거나 앱을 종료합니다. 다시 실행하고 최근 영상을 열어 저장한 위치에서 재생되는지 확인합니다. 기록이 목록에 남는 것만으로 통과하지 않습니다.
- 업데이트: 설치 전후 APK 식별값을 남기고 덮어 설치한 뒤 파일 접근과 이어보기를 확인합니다. 같은 APK 재설치와 다른 버전 업데이트, 저장 구조 변경 검증을 구분합니다.
- 실패 대응: 권한 거절과 취소, 검사용 파일의 이동과 삭제, 지원하지 않는 파일에서 안내와 재선택을 확인합니다.

전체 파일 지원과 실제 기기 호환성은 샘플 하나나 가상 기기 결과로 확정하지 않습니다. 자막, 소리, 재생 완료, 기기 재시작과 성능 등 세부 항목은 [검증 기록](verification.md#검사-항목)을 따릅니다.

## 증거

- 화면 PNG와 화면 요소 XML은 서로 다른 시점에 수집됩니다. 재생 중 시간이 다르면 수집 순서를 고려하고, 정확한 상태 비교가 필요하면 일시정지한 뒤 수집합니다.
- 원본 보존을 검사할 때는 재생 전후 파일 해시를 비교합니다. 검사 중 바꾼 회전 설정은 원래 값으로 되돌립니다.
