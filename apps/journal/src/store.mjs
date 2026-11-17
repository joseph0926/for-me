import { mkdir, readFile, lstat, open, rename, unlink, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { check, JournalError, initialState, validateState, validateApp, validateRecord, newRecord, requestHash } from './model.mjs';

const maxBytes = 32 * 1024 * 1024;
const delay = ms => new Promise(done => setTimeout(done, ms));

export class Store {
  constructor(directory) {
    this.directory = resolve(directory);
    this.file = join(this.directory, 'journal.json');
    this.lock = join(this.directory, '.writer-lock');
  }

  async prepare() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.directory);
    check(info.isDirectory() && !info.isSymbolicLink(), '저장 폴더는 실제 디렉터리여야 합니다.');
  }

  async initialize() {
    await this.prepare();
    await this.exclusive(async () => {
      try { await this.read(); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await this.save(initialState());
      }
    });
  }

  async read() {
    const info = await lstat(this.file);
    check(info.isFile() && !info.isSymbolicLink() && info.size <= maxBytes, '저장 파일을 안전하게 읽을 수 없습니다.');
    try { return validateState(JSON.parse(await readFile(this.file, 'utf8'))); }
    catch (error) {
      if (error instanceof JournalError) throw error;
      throw new JournalError('저장 파일을 읽을 수 없습니다. 자동 초기화하지 않습니다. 백업을 확인하세요.', 500);
    }
  }

  async exclusive(action) {
    const deadline = Date.now() + 3000;
    while (true) {
      try { await mkdir(this.lock, { mode: 0o700 }); break; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (Date.now() >= deadline) throw new JournalError('다른 기록 작업이 진행 중입니다. 계속되면 README의 잠금 복구 절차를 확인하세요.', 409);
        await delay(25);
      }
    }
    try {
      const owner = await open(join(this.lock, 'owner.json'), 'wx', 0o600);
      try { await owner.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() })); }
      finally { await owner.close(); }
      return await action();
    } finally {
      await unlink(join(this.lock, 'owner.json')).catch(error => { if (error.code !== 'ENOENT') throw error; });
      await rmdir(this.lock);
    }
  }

  async save(state) {
    validateState(state);
    const content = JSON.stringify(state, null, 2) + '\n';
    check(Buffer.byteLength(content) <= maxBytes, '기록 파일이 32 MiB를 초과합니다. 저장하지 않았습니다. 백업 후 보관 정책을 검토하세요.');
    const temporary = join(this.directory, `.write-${randomUUID()}.json`);
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(content);
        await handle.sync();
      } finally { await handle.close(); }
      await rename(temporary, this.file);
    }
    finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }

  async execute(input) {
    check(input && typeof input === 'object' && !Array.isArray(input), '명령 객체가 필요합니다.');
    check(typeof input.operationId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(input.operationId), '고유한 operationId가 필요합니다.');
    check(['user', 'ai'].includes(input.actor), 'actor는 user 또는 ai여야 합니다.');
    check(input.data && typeof input.data === 'object' && !Array.isArray(input.data), 'data 객체가 필요합니다.');
    const hash = requestHash(input);
    return this.exclusive(async () => {
      const state = await this.read();
      const previous = state.operations.find(item => item.id === input.operationId);
      if (previous) {
        check(previous.hash === hash, '같은 operationId에 다른 내용을 보낼 수 없습니다.', 409);
        return { ...previous.result, replayed: true };
      }
      check(input.expectedRevision === state.revision, '다른 창이나 AI가 기록을 변경했습니다. 최신 내용을 조회한 뒤 다시 저장하세요.', 409);
      const at = new Date().toISOString();
      const data = input.data;
      let before = null;
      let after = null;
      if (input.command === 'record.create') {
        after = newRecord(data, randomUUID(), at);
        after.appNameAtCreation = state.apps.find(app => app.id === after.appId)?.name ?? '';
        if (input.actor === 'ai') check(data.authority, 'AI는 근거 구분을 명시해야 합니다.');
        validateRecord(after, state);
        state.records.push(after);
      } else if (['record.update', 'record.trash', 'record.restore'].includes(input.command)) {
        const index = state.records.findIndex(record => record.id === data.id);
        check(index >= 0, '기록을 찾을 수 없습니다.', 404);
        before = structuredClone(state.records[index]);
        after = structuredClone(before);
        if (input.command === 'record.update') {
          check(data.patch && typeof data.patch === 'object' && !Array.isArray(data.patch), '수정할 patch가 필요합니다.');
          check(!Object.hasOwn(data.patch, 'appId') && !Object.hasOwn(data.patch, 'originalQuote'), '앱과 사용자 원문은 바꿀 수 없습니다. 정정 기록을 연결하세요.');
          newRecord(data.patch, after.id, at);
          Object.assign(after, data.patch);
        } else after.deleted = input.command === 'record.trash';
        after.updatedAt = at;
        validateRecord(after, state);
        state.records[index] = after;
      } else if (input.command === 'app.create' || input.command === 'app.update') {
        const index = state.apps.findIndex(app => app.id === data.id);
        check(input.command === 'app.create' ? index < 0 : index >= 0, '앱 ID가 이미 있거나 등록되지 않았습니다.');
        check(Object.keys(data).every(key => ['id', 'name', 'platform', 'folder', 'status', 'reason'].includes(key)), '지원하지 않는 앱 항목입니다.');
        before = index < 0 ? null : structuredClone(state.apps[index]);
        const { reason, ...properties } = data;
        after = { status: 'unknown', platform: '', folder: '', ...before, ...properties };
        validateApp(after);
        if (before && before.status !== after.status) {
          check(typeof reason === 'string' && reason.trim(), '사용 상태를 바꾼 이유를 남겨 주세요.');
          const note = newRecord({ appId: after.id, kind: 'status', title: '사용 상태 변경', body: reason, authority: input.actor === 'ai' ? 'interpretation' : 'user', details: `${before.status} → ${after.status}` }, randomUUID(), at);
          note.appNameAtCreation = after.name;
          state.records.push(note);
        }
        if (index < 0) state.apps.push(after);
        else state.apps[index] = after;
      } else if (input.command === 'backup.restore') {
        const backup = validateState(data.snapshot);
        check(data.confirm === 'restore', '백업 복원을 명시적으로 확인하세요.');
        before = { apps: state.apps, records: state.records };
        after = { apps: structuredClone(backup.apps), records: structuredClone(backup.records) };
        state.apps = after.apps;
        state.records = after.records;
        // 복원 전 이력과 가져온 백업의 이력을 모두 남긴다.
        state.history.push({ revision: state.revision + 1, at, command: 'backup.imported-history', history: backup.history });
      } else throw new JournalError('지원하지 않는 명령입니다.');
      state.revision += 1;
      state.history.push({ revision: state.revision, at, actor: input.actor, command: input.command, before, after });
      const result = { revision: state.revision, id: after?.id ?? null };
      state.operations.push({ id: input.operationId, hash, result });
      await this.save(state);
      return result;
    });
  }
}
