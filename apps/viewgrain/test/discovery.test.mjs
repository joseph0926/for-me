import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getReferenceSet, listReferenceSets } from '../src/catalog.mjs';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const legacy = [
  ['scene-001', 'video-streaming-scene', 'scene-001-home', 'home', '84a7dba8fbbd8a431bad8320d4034d3c8f83ade0c56a622fe6b1de271be5477b'],
  ['scene-001', 'video-streaming-scene', 'scene-001-player-portrait', 'player-portrait', 'dabdcd6064b6a2cf2f19e42808bc06c105724a60fafeac729fab5c884cb4a3c0'],
  ['scene-001', 'video-streaming-scene', 'scene-001-player-landscape', 'player-landscape', '62b3f239e2309219072cfa45ad40208fbd5379e89bc240fc24594d392eea19b3'],
  ['frame-002', 'film-collection-frame', 'frame-002-collection-list', 'collection-list', 'c84a5371fa9e091ac222e04bfdfaf1f9e1d3f6989034c7119aafb09df0ae346a'],
  ['logs-003', 'service-logs', 'logs-003-investigation', 'investigation-selected-request', '37ab4825a5d83eea1abb0672e70e20ec0f713f7224035937f4f572dba80ec134'],
];

test('ID를 모르는 클라이언트가 목록에서 시작해 모든 화면을 읽고 이전 ID도 계속 사용한다', async t => {
  const client = new Client({ name: 'viewgrain-discovery-test', version: '0.1.0' });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(appRoot, 'src/server.mjs')] }));
  const { tools } = await client.listTools();
  assert.ok(tools.some(tool => tool.name === 'list_reference_sets'));
  const result = await client.callTool({ name: 'list_reference_sets', arguments: {} });
  assert.ok(!result.isError);
  assert.ok(result.content.every(item => item.type === 'text'));
  const sets = result.structuredContent.sets;
  assert.deepEqual(sets.map(set => set.id), ['film-collection-frame', 'service-logs', 'video-streaming-scene']);
  for (const entry of sets) {
    assert.ok(entry.title && entry.domain && entry.platforms.length && entry.screens.length);
    assert.ok(!('prompt_record_text' in entry));
    const detail = await client.callTool({ name: 'get_reference_set', arguments: { set_id: entry.id, version: entry.version } });
    assert.ok(!detail.isError);
    for (const image of detail.structuredContent.images) {
      const response = await client.callTool({ name: 'get_reference', arguments: { set_id: entry.id, version: entry.version, image_id: image.id } });
      assert.ok(!response.isError);
      assert.equal(response.content.filter(item => item.type === 'image').length, 1);
    }
  }
  const logs = sets.find(set => set.id === 'service-logs');
  assert.equal(logs.domain, 'observability');
  assert.deepEqual(logs.platforms, ['desktop-web']);
  assert.equal(logs.selection.satisfaction, 'provisional');
  assert.equal(logs.selection.user_statement, '100% 만족은 아니지만 일단 등록해주세요.');
  for (const [oldSet, newSet, oldImage, newImage, expectedHash] of legacy) {
    const set = await client.callTool({ name: 'get_reference_set', arguments: { set_id: oldSet, version: 1 } });
    assert.ok(!set.isError);
    assert.equal(set.structuredContent.id, newSet);
    // 과거 요청뿐 아니라 새 묶음 ID와 이전 이미지 ID를 섞은 요청도 같은 원본을 가리킨다.
    for (const [setId, imageId] of [[oldSet, oldImage], [newSet, oldImage], [oldSet, newImage]]) {
      const response = await client.callTool({ name: 'get_reference', arguments: { set_id: setId, version: 1, image_id: imageId } });
      assert.ok(!response.isError);
      const image = response.content.find(item => item.type === 'image');
      assert.equal(createHash('sha256').update(Buffer.from(image.data, 'base64')).digest('hex'), expectedHash);
    }
  }
  const unknownVersion = await client.callTool({ name: 'get_reference_set', arguments: { set_id: 'scene-001', version: 2 } });
  assert.equal(unknownVersion.isError, true);
  assert.equal(JSON.parse(unknownVersion.content[0].text).code, 'NOT_FOUND');
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'viewgrain-discovery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const set = join(root, 'video-streaming-scene', 'v1');
  await cp(join(appRoot, 'references/video-streaming-scene/v1'), set, { recursive: true });
  return { root, set };
}

test('빈 목록과 모든 버전을 반환하고 읽을 수 없는 manifest를 누락시키지 않는다', async t => {
  const { root, set } = await fixture(t);
  const empty = join(root, 'empty');
  await mkdir(empty);
  assert.deepEqual(await listReferenceSets(empty), { sets: [] });
  const v2 = join(root, 'video-streaming-scene', 'v2');
  await cp(set, v2, { recursive: true });
  const file = join(v2, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  manifest.version = 2;
  await writeFile(file, JSON.stringify(manifest));
  const result = await listReferenceSets(root);
  assert.deepEqual(result.sets.map(entry => entry.version), [1, 2]);
  for (const entry of result.sets) {
    assert.equal((await getReferenceSet({ set_id: entry.id, version: entry.version }, root)).version, entry.version);
  }
  await writeFile(file, '{');
  await assert.rejects(listReferenceSets(root), { code: 'INVALID_MANIFEST' });
  await rm(file);
  await assert.rejects(listReferenceSets(root), { code: 'NOT_FOUND' });
});

test('별칭 충돌과 잘못된 별칭, 폴더 링크를 목록과 상세에서 거부한다', async t => {
  const { root, set } = await fixture(t);
  const file = join(set, 'manifest.json');
  const original = JSON.parse(await readFile(file, 'utf8'));
  for (const aliases of [['home'], ['player-portrait'], ['scene-001-player-portrait'], ['../outside'], ['a'.repeat(151)], 'home']) {
    const manifest = structuredClone(original);
    manifest.images[0].aliases = aliases;
    await writeFile(file, JSON.stringify(manifest));
    await assert.rejects(listReferenceSets(root), { code: 'INVALID_MANIFEST' });
    await assert.rejects(getReferenceSet({ set_id: 'scene-001', version: 1 }, root), { code: 'INVALID_MANIFEST' });
  }
  await writeFile(file, JSON.stringify(original));
  const versionLink = join(root, 'video-streaming-scene', 'v2');
  await symlink(set, versionLink, 'junction');
  await assert.rejects(listReferenceSets(root), { code: 'INVALID_PATH' });
  await rm(versionLink);
  const setLink = join(root, 'linked-set');
  await symlink(join(root, 'video-streaming-scene'), setLink, 'junction');
  await assert.rejects(listReferenceSets(root), { code: 'INVALID_PATH' });
  await rm(setLink);
  assert.equal((await listReferenceSets(root)).sets.length, 1);
});
