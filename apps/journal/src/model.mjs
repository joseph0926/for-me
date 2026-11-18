import { createHash } from 'node:crypto';

export class JournalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const kinds = ['use', 'request', 'change', 'verification', 'release', 'followup', 'origin', 'status'];
export const statuses = ['unknown', 'active', 'occasional', 'waiting', 'stopped'];
export const stages = ['unknown', 'open', 'in_progress', 'waiting', 'done'];
export const authorities = ['user', 'interpretation', 'verified'];
export const releaseStates = ['development', 'built', 'installed', 'used'];
export const kindNames = { use: '사용', request: '불편과 요청', change: '변경', verification: '검증', release: '버전', followup: '후속 사용', origin: '만든 이유', status: '상태 변경' };

export function check(condition, message, status = 400) {
  if (!condition) throw new JournalError(message, status);
}

function object(value) {
  check(value && typeof value === 'object' && !Array.isArray(value), '객체가 필요합니다.');
}

function text(value, name, max = 20000, required = false) {
  check(typeof value === 'string' && value.length <= max && (!required || value.trim()), `${name} 값이 없거나 너무 깁니다.`);
}

function choice(value, values, name) {
  check(values.includes(value), `${name} 값이 올바르지 않습니다.`);
}

export function validId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

export function validateApp(app) {
  object(app);
  check(validId(app.id), '앱 ID가 올바르지 않습니다.');
  text(app.name, '이름', 120, true);
  text(app.platform, '플랫폼', 200);
  choice(app.status, statuses, '사용 상태');
  text(app.folder, '폴더', 300);
  check(!app.folder || (/^apps\/[a-zA-Z0-9_/-]+$/.test(app.folder) && !app.folder.includes('//')), '앱 폴더는 저장소의 apps 아래 경로여야 합니다.');
}

export function validateRecord(record, state) {
  object(record);
  check(validId(record.id), '기록 ID가 올바르지 않습니다.');
  check(state.apps.some(app => app.id === record.appId), '등록된 앱이 아닙니다.');
  text(record.appNameAtCreation, '기록 당시 앱 이름', 120, true);
  choice(record.kind, kinds, '기록 종류');
  choice(record.authority, authorities, '근거 구분');
  choice(record.stage, stages, '진행 상태');
  choice(record.context, ['daily', 'test'], '사용 구분');
  choice(record.measurement, ['unknown', 'estimate', 'measured'], '측정 구분');
  text(record.title, '제목', 200, true);
  text(record.body, '내용', 20000, true);
  for (const key of ['createdAt', 'updatedAt']) {
    check(typeof record[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(record[key]) && Number.isFinite(Date.parse(record[key])), `${key} 시각이 올바르지 않습니다.`);
  }
  for (const key of ['originalQuote', 'source', 'version', 'build', 'device', 'details']) text(record[key], key);
  const occurredAt = new Date(`${record.occurredOn}T12:00:00Z`);
  check(/^\d{4}-\d{2}-\d{2}$/.test(record.occurredOn) && Number.isFinite(occurredAt.getTime()) && occurredAt.toISOString().slice(0, 10) === record.occurredOn, '사용 날짜가 올바르지 않습니다.');
  choice(record.releaseState, releaseStates, '버전 상태');
  for (const key of ['minutes', 'count', 'effortMinutes']) {
    check(record[key] === null || (typeof record[key] === 'number' && Number.isFinite(record[key]) && record[key] >= 0 && record[key] <= 10000000), `${key}는 0 이상의 숫자여야 합니다.`);
  }
  check((record.minutes === null && record.count === null) || record.measurement !== 'unknown', '횟수나 시간을 입력하면 실측 또는 추정을 선택하세요.');
  check(typeof record.deleted === 'boolean', '휴지통 상태가 올바르지 않습니다.');
  check(record.parentId === null || (validId(record.parentId) && record.parentId !== record.id), '연결할 기록이 올바르지 않습니다.');
  if (record.parentId) {
    const parent = state.records.find(item => item.id === record.parentId);
    check(parent && parent.appId === record.appId, '같은 앱의 기존 기록에 연결하세요.');
    const visited = new Set([record.id]);
    let cursor = parent;
    while (cursor) {
      check(!visited.has(cursor.id), '기록을 순환해서 연결할 수 없습니다.');
      visited.add(cursor.id);
      cursor = state.records.find(item => item.id === cursor.parentId);
    }
  }
}

export function validateState(state) {
  object(state);
  check(state.schemaVersion === 1, '지원하지 않는 저장 형식입니다. 원본을 보존하고 앱 버전을 확인하세요.');
  check(Number.isSafeInteger(state.revision) && state.revision >= 0, '저장 revision이 올바르지 않습니다.');
  check(Array.isArray(state.apps) && Array.isArray(state.records) && Array.isArray(state.history) && Array.isArray(state.operations), '저장 파일 구조가 올바르지 않습니다.');
  check(new Set(state.apps.map(item => item.id)).size === state.apps.length, '앱 ID가 중복됩니다.');
  check(new Set(state.records.map(item => item.id)).size === state.records.length, '기록 ID가 중복됩니다.');
  state.apps.forEach(validateApp);
  state.records.forEach(record => validateRecord(record, state));
  for (const item of state.operations) {
    check(validId(item.id) && typeof item.hash === 'string' && item.result && typeof item.result === 'object', '요청 보존 정보가 올바르지 않습니다.');
  }
  for (const item of state.history) {
    check(Number.isSafeInteger(item.revision) && typeof item.at === 'string' && typeof item.command === 'string', '변경 이력이 올바르지 않습니다.');
  }
  return state;
}

export function initialState() {
  return {
    schemaVersion: 1, revision: 0,
    apps: [
      ['video', '동영상', 'Android'], ['screen-gif', '화면 녹화 GIF', 'Windows / macOS'],
      ['termkeys', 'TermKeys', 'macOS'],
    ].map(([id, name, platform]) => ({ id, name, platform, folder: `apps/${id}`, status: 'unknown' })),
    records: [], history: [], operations: [],
  };
}

export function requestHash(command) {
  return createHash('sha256').update(JSON.stringify([command.command, command.actor, command.data])).digest('hex');
}

export function newRecord(input, id, at) {
  const fields = ['appId', 'kind', 'title', 'body', 'originalQuote', 'source', 'version', 'build', 'device', 'details', 'occurredOn', 'parentId', 'authority', 'stage', 'context', 'measurement', 'releaseState', 'minutes', 'count', 'effortMinutes'];
  check(Object.keys(input).every(key => fields.includes(key)), '지원하지 않는 기록 항목입니다.');
  return {
    appId: '', kind: 'use', title: '', body: '', originalQuote: '', source: '', version: '', build: '', device: '', details: '',
    occurredOn: at.slice(0, 10), parentId: null, authority: 'user', stage: 'unknown', context: 'daily',
    measurement: 'unknown', releaseState: 'development', minutes: null, count: null, effortMinutes: null,
    ...input, id, createdAt: at, updatedAt: at, deleted: false,
  };
}
