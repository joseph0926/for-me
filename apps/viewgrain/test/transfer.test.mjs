import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { exportReference, importReference } from '../src/transfer.mjs';
import { getReference, getReferenceSet, listReferenceSets, referenceRoot } from '../src/catalog.mjs';

test('자료를 내보내고 독립된 보관함으로 가져오며 재시도와 원본을 보존한다', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'viewgrain-transfer-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const input = { set_id: 'film-collection-frame', version: 1, image_id: 'collection-list' };
  const original = await getReference(input);
  const directory = join(temporary, 'bundle');
  await exportReference(input, directory);
  await exportReference(input, directory);
  const meta = JSON.parse(await readFile(join(directory, 'reference.json')));
  assert.equal(meta.source.set_id, 'film-collection-frame');
  assert.equal(meta.image.sha256, original.metadata.sha256);
  const root = join(temporary, 'references');
  await importReference(directory, 'imported-frame', 1, root);
  await importReference(directory, 'imported-frame', 1, root);
  const result = await getReference({ set_id: 'imported-frame', version: 1, image_id: 'screen' }, root);
  assert.equal(result.image.data, original.image.data);
  assert.deepEqual(result.metadata.selection, original.metadata.selection);
  assert.equal((await getReference(input)).image.data, original.image.data);
  meta.notes += '\n이전 버전 덮어쓰기 시도';
  await writeFile(join(directory, 'reference.json'), JSON.stringify(meta));
  await assert.rejects(importReference(directory, 'imported-frame', 1, root), /덮어쓰지/);
});

test('가져오기 실패가 기존 목록 조회를 깨뜨리지 않는다', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'viewgrain-invalid-import-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const directory = join(temporary, 'bundle');
  const root = join(temporary, 'references');
  await exportReference({ set_id: 'film-collection-frame', version: 1, image_id: 'collection-list' }, directory);
  const meta = JSON.parse(await readFile(join(directory, 'reference.json')));
  await importReference(directory, 'valid-frame', 1, root);
  const before = await listReferenceSets(root);
  for (const id of ['frame-002', 'scene-001', 'logs-003']) {
    await assert.rejects(importReference(directory, id, 1, root));
    assert.deepEqual(await listReferenceSets(root), before);
  }
  for (const selection of ['invalid', [], 1]) {
    await writeFile(join(directory, 'reference.json'), JSON.stringify({ ...meta, selection }));
    await assert.rejects(importReference(directory, 'invalid-frame', 1, root));
    assert.deepEqual(await listReferenceSets(root), before);
  }
  const large = { ...meta, title: '', notes: '', source: {}, selection: {}, artifacts: {} };
  large.title = 'x'.repeat(128 * 1024 - Buffer.byteLength(JSON.stringify(large)) - 1);
  await writeFile(join(directory, 'reference.json'), JSON.stringify(large));
  await assert.rejects(importReference(directory, 'large-frame', 1, root));
  assert.deepEqual(await listReferenceSets(root), before);
});

test('Lab 전체 화면과 실행 자료를 함께 보관하고 조회와 재내보내기로 연결한다', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'viewgrain-adopted-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const directory = join(temporary, 'bundle');
  await exportReference({ set_id: 'film-collection-frame', version: 1, image_id: 'collection-list' }, directory);
  const meta = JSON.parse(await readFile(join(directory, 'reference.json')));
  const html = '<!doctype html><p>선택한 전체 화면</p>';
  await mkdir(join(directory, 'implementation'));
  await writeFile(join(directory, 'implementation/screen.html'), html);
  meta.source = { provider: 'tastepin', study: 'frame', revision: 'r2', adoption: 'fixture-only' };
  meta.viewport = { width: 390, height: 760 };
  meta.display_state = '목록 첫 화면';
  meta.selection = { satisfaction: 'adopted', user_statement: '검사용 채택', scope: '화면 하나' };
  meta.artifacts = { 'implementation/screen.html': createHash('sha256').update(html).digest('hex') };
  await writeFile(join(directory, 'reference.json'), JSON.stringify(meta));
  const root = join(temporary, 'references');
  await importReference(directory, 'adopted-frame', 1, root);
  const set = await getReferenceSet({ set_id: 'adopted-frame', version: 1 }, root);
  assert.equal(set.implementation.source.adoption, 'fixture-only');
  assert.equal(set.status.implementation_verified, false);
  const reference = await getReference({ set_id: 'adopted-frame', version: 1, image_id: 'screen' }, root);
  assert.equal(reference.metadata.implementation.source.revision, 'r2');
  await exportReference({ set_id: 'adopted-frame', version: 1, image_id: 'screen' }, join(temporary, 'again'), root);
  assert.equal(await readFile(join(temporary, 'again/implementation/screen.html'), 'utf8'), html);
  const again = JSON.parse(await readFile(join(temporary, 'again/reference.json')));
  assert.deepEqual(again.viewport, meta.viewport);
  assert.equal(again.display_state, meta.display_state);
  await writeFile(join(directory, 'implementation/screen.html'), '변조');
  await assert.rejects(importReference(directory, 'broken', 1, root), /등록 정보/);
  await assert.rejects(importReference(directory, '../escape', 1, root));
});
