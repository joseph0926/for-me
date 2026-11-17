import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rename, symlink, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.mjs';
import { connections, readDocument } from '../src/repository.mjs';
import { exportMarkdown } from '../src/export.mjs';
import { startServer } from '../src/server.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'for-me-journal-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(join(root, 'data'));
  await store.initialize();
  return { root, store };
}

function request(revision, command, data, operationId = randomUUID()) {
  return { expectedRevision: revision, operationId, actor: 'ai', command, data };
}

const note = (extra = {}) => ({ appId: 'video', kind: 'request', body: '가로로 볼 때 버튼이 왼쪽에 있어 불편합니다.', title: '가로 재생 조작', originalQuote: '가운데로 옮겨주세요', authority: 'user', stage: 'open', occurredOn: '2026-11-17', ...extra });

test('요청부터 수정과 실제 사용까지 연결하고 원문, 버전, 정정 이력을 보존한다', async t => {
  const { store } = await fixture(t);
  const created = await store.execute(request(0, 'record.create', note()));
  const changed = await store.execute(request(1, 'record.create', note({ kind: 'change', parentId: created.id, originalQuote: '', authority: 'verified', body: '조작을 중앙으로 옮겼습니다.', version: '0.2.0' })));
  await store.execute(request(2, 'record.create', note({ kind: 'followup', parentId: changed.id, body: '써 보니 편합니다.', originalQuote: '써 보니 편합니다.', device: '테스트 기기' })));
  await store.execute(request(3, 'record.update', { id: created.id, patch: { stage: 'done' } }));
  const state = await store.read();
  assert.equal(state.records[0].originalQuote, '가운데로 옮겨주세요');
  assert.equal(state.records[2].parentId, changed.id);
  assert.equal(state.history.at(-1).before.stage, 'open');
  assert.equal(state.history.at(-1).after.stage, 'done');
  await assert.rejects(store.execute(request(4, 'record.update', { id: created.id, patch: { originalQuote: '꾸며 낸 원문' } })), /원문/);
  await assert.rejects(store.execute(request(4, 'record.update', { id: created.id, patch: { parentId: changed.id } })), /순환/);
  assert.equal((await store.read()).revision, 4);
  assert.match(exportMarkdown(state), /가운데로 옮겨주세요/);
  assert.doesNotMatch(exportMarkdown(state, { from: '2026-11-18' }), /가로 재생 조작/);
});

test('중복 제출은 한 번만 저장하고 오래된 수정 및 다른 내용의 재사용을 거절한다', async t => {
  const { store } = await fixture(t);
  const input = request(0, 'record.create', note(), 'one-request');
  const first = await store.execute(input);
  const replay = await store.execute(input);
  assert.equal(replay.id, first.id);
  assert.equal(replay.replayed, true);
  assert.equal((await store.read()).records.length, 1);
  await assert.rejects(store.execute({ ...input, data: note({ body: '다른 내용' }) }), error => error.status === 409);
  await assert.rejects(store.execute(request(0, 'record.create', note())), error => error.status === 409);
});

test('휴지통, 재시작, 백업 복원 뒤에도 원문과 복원 전 기록을 보존한다', async t => {
  const { root, store } = await fixture(t);
  const first = await store.execute(request(0, 'record.create', note()));
  const backup = await store.read();
  await store.execute(request(1, 'record.trash', { id: first.id }));
  assert.doesNotMatch(exportMarkdown(await store.read()), /가로 재생 조작/);
  const restarted = new Store(join(root, 'data'));
  await restarted.initialize();
  assert.equal((await restarted.read()).records[0].deleted, true);
  await restarted.execute(request(2, 'record.restore', { id: first.id }));
  await restarted.execute(request(3, 'record.create', note({ body: '백업 뒤에 쓴 기록' })));
  await restarted.execute(request(4, 'backup.restore', { snapshot: backup, confirm: 'restore' }));
  const restored = await restarted.read();
  assert.equal(restored.records.length, 1);
  assert.equal(restored.records[0].deleted, false);
  assert.equal(restored.history.at(-1).before.records[1].body, '백업 뒤에 쓴 기록');
  assert.equal(restored.history.at(-1).before.records[0].originalQuote, '가운데로 옮겨주세요');
  assert.equal(restored.revision, 5);
});

test('폴더 이동과 앱 이름 변경, 문서 누락, 앱 폴더 제거가 기록을 지우지 않는다', async t => {
  const { root, store } = await fixture(t);
  await mkdir(join(root, 'apps/video/docs'), { recursive: true });
  await writeFile(join(root, 'apps/video/README.md'), '기존 소개');
  await store.execute(request(0, 'record.create', note()));
  await rename(join(root, 'apps/video'), join(root, 'apps/player'));
  let state = await store.read();
  assert.equal((await connections(root, state.apps))[0].documents[0].available, false);
  await store.execute(request(1, 'app.update', { id: 'video', name: '새 동영상 이름', folder: 'apps/player' }));
  state = await store.read();
  assert.equal((await connections(root, state.apps))[0].documents[0].available, true);
  assert.equal(await readDocument(root, state.apps[0], 'README.md'), '기존 소개');
  await assert.rejects(readDocument(root, state.apps[0], '../.env'), /허용된/);
  await symlink(join(root, 'apps/player/README.md'), join(root, 'apps/player/docs/scope.md'));
  assert.equal((await connections(root, state.apps))[0].documents[1].available, false);
  await rm(join(root, 'apps/player'), { recursive: true });
  await store.execute(request(2, 'record.create', note({ body: '폴더 없이도 기록합니다.' })));
  assert.equal((await store.read()).records.length, 2);
  assert.equal((await store.read()).records[0].appId, 'video');
  assert.equal((await store.read()).records[0].appNameAtCreation, '동영상');
  assert.match(exportMarkdown(await store.read()), /동영상 \(현재 새 동영상 이름\)/);
});

test('잘못된 입력과 미래 저장 형식을 거절하며 손상 파일을 초기화하지 않는다', async t => {
  const { store } = await fixture(t);
  const original = await readFile(store.file, 'utf8');
  for (const input of [note({ occurredOn: '2026-02-31' }), note({ occurredOn: '2026-99-99' }), note({ minutes: -1 }), note({ minutes: 4 }), note({ appId: 'missing' })]) {
    await assert.rejects(store.execute(request(0, 'record.create', input)));
    assert.equal(await readFile(store.file, 'utf8'), original);
  }
  await assert.rejects(store.execute(request(0, 'backup.restore', { snapshot: { ...JSON.parse(original), schemaVersion: 2 }, confirm: 'restore' })), /지원하지 않는 저장 형식/);
  await writeFile(store.file, '{broken');
  await assert.rejects(store.initialize(), /초기화하지/);
  assert.equal(await readFile(store.file, 'utf8'), '{broken');
  assert.deepEqual((await readdir(store.directory)).filter(name => name === '.writer-lock'), []);
});

function runCli(args, input) {
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', code => done({ code, stdout, stderr }));
    child.stdin.end(input ? JSON.stringify(input) : undefined);
  });
}

test('별도 AI 프로세스와 서버가 동시에 써도 유실 없이 한 요청만 승인한다', async t => {
  const { store } = await fixture(t);
  const outputs = await Promise.all([
    runCli(['write', '--data-dir', store.directory], request(0, 'record.create', note())),
    runCli(['write', '--data-dir', store.directory], request(0, 'record.create', note({ body: '다른 프로세스의 기록' }))),
  ]);
  assert.deepEqual(outputs.map(result => result.code).sort(), [0, 1]);
  const failed = outputs.find(result => result.code === 1);
  assert.equal(JSON.parse(failed.stderr).status, 409);
  const state = await store.read();
  assert.equal(state.records.length, 1);
  const read = await runCli(['read', '--data-dir', store.directory]);
  assert.equal(JSON.parse(read.stdout).revision, 1);
});

test('웹과 AI가 같은 기록을 읽고 외부 사이트의 쓰기와 호스트 위조를 거절한다', async t => {
  const { root, store } = await fixture(t);
  const { server, origin } = await startServer({ directory: store.directory, repository: root, port: 0 });
  t.after(() => new Promise(done => { server.closeAllConnections(); server.close(done); }));
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const payload = await (await fetch(origin + '/api/state')).json();
  const input = request(0, 'record.create', note());
  const post = headers => fetch(origin + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(input) });
  assert.equal((await post({})).status, 403);
  assert.equal((await post({ 'X-Journal-Token': payload.token, Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post({ 'X-Journal-Token': payload.token })).status, 200);
  const read = await runCli(['read', '--data-dir', store.directory]);
  assert.equal(JSON.parse(read.stdout).records[0].originalQuote, '가운데로 옮겨주세요');
  const hostileHostStatus = await new Promise((done, reject) => {
    get(origin + '/api/state', { headers: { Host: 'untrusted.example' } }, response => { response.resume(); done(response.statusCode); }).on('error', reject);
  });
  assert.equal(hostileHostStatus, 403);
  assert.equal((await fetch(origin + '/.env')).status, 404);
  assert.equal((await fetch(origin + '/api/document?appId=video&name=..%2F.env')).status, 404);
  const backup = await (await fetch(origin + '/api/backup')).json();
  assert.equal(backup.records.length, 1);
  assert.match(await (await fetch(origin + '/api/export')).text(), /가운데로 옮겨주세요/);
});
