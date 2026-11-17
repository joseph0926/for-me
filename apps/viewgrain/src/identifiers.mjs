// 목록에 포함할 ID와 상세 조회 입력은 같은 문자 및 길이 계약을 사용한다.
export const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const setIdMaxLength = 100;
export const imageIdMaxLength = 150;

// 공개된 이전 묶음 ID는 버전을 바꾸지 않고 새 보관 경로로 연결한다.
export const legacySetIds = new Map([
  ['scene-001', 'video-streaming-scene'],
  ['frame-002', 'film-collection-frame'],
  ['logs-003', 'service-logs'],
]);
