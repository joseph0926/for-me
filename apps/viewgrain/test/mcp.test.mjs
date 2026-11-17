import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, cp, mkdtemp, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getReference, getReferenceSet, referenceRoot } from '../src/catalog.mjs';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const scene = { set_id: 'scene-001', version: 1, image_id: 'scene-001-home' };
const selectedImages = [
  ['scene-001', 'scene-001-home', 'home.png', '84a7dba8fbbd8a431bad8320d4034d3c8f83ade0c56a622fe6b1de271be5477b'],
  ['scene-001', 'scene-001-player-portrait', 'player-portrait.png', 'dabdcd6064b6a2cf2f19e42808bc06c105724a60fafeac729fab5c884cb4a3c0'],
  ['scene-001', 'scene-001-player-landscape', 'player-landscape.png', '62b3f239e2309219072cfa45ad40208fbd5379e89bc240fc24594d392eea19b3'],
  ['frame-002', 'frame-002-collection-list', 'collection-list.png', 'c84a5371fa9e091ac222e04bfdfaf1f9e1d3f6989034c7119aafb09df0ae346a'],
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('실제 stdio 연결에서 선택 이미지 네 장과 기록을 반환하고 원본을 보존한다', { timeout: 20000 }, async t => {
  const client = new Client({ name: 'viewgrain-test', version: '0.1.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(appRoot, 'src/server.mjs')], cwd: tmpdir(), stderr: 'pipe' });
  let stderr = '';
  transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
  t.after(async () => { await client.close(); });
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_reference', 'get_reference_set']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint && !tool.annotations.openWorldHint));
  const before = new Map();
  for (const setId of ['scene-001', 'frame-002']) {
    for (const file of ['manifest.json', 'README.md', 'prompts.md']) {
      const path = join(referenceRoot, setId, 'v1', file);
      before.set(path, hash(await readFile(path)));
    }
  }
  const set = await client.callTool({ name: 'get_reference_set', arguments: { set_id: 'scene-001', version: 1 } });
  assert.ok(!set.isError);
  assert.equal(set.structuredContent.images.length, 3);
  assert.ok(set.content.every(item => item.type === 'text'));
  for (const [setId, imageId, file, expectedHash] of selectedImages) {
    const response = await client.callTool({ name: 'get_reference', arguments: { set_id: setId, version: 1, image_id: imageId } });
    assert.ok(!response.isError, JSON.stringify(response.content.filter(item => item.type === 'text')));
    const images = response.content.filter(item => item.type === 'image');
    assert.equal(images.length, 1);
    assert.equal(images[0].mimeType, 'image/png');
    assert.equal(hash(Buffer.from(images[0].data, 'base64')), expectedHash);
    assert.equal(response.structuredContent.image_id, imageId);
    assert.equal(response.structuredContent.status.implementation_verified, false);
    assert.equal(response.structuredContent.generation.model, null);
    assert.ok(response.structuredContent.prompt_record_text.length > 0);
    assert.equal(hash(await readFile(join(referenceRoot, setId, 'v1', file))), expectedHash);
  }
  const minimal = await client.callTool({ name: 'get_reference', arguments: { ...scene, include_context: false } });
  assert.deepEqual(Object.keys(minimal.structuredContent).sort(), ['height', 'image_id', 'set_id', 'sha256', 'version', 'width']);
  assert.equal(minimal.content.filter(item => item.type === 'image').length, 1);
  for (const args of [{ ...scene, version: 2 }, { ...scene, image_id: 'missing' }]) {
    const result = await client.callTool({ name: 'get_reference', arguments: args });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).code, 'NOT_FOUND');
    assert.ok(!result.content.some(item => item.type === 'image'));
  }
  for (const args of [{ ...scene, set_id: '../scene-001' }, { ...scene, version: 1.5 }, { ...scene, include_context: 'false' }, { ...scene, file: 'README.md' }]) {
    // SDK가 잘못된 인수를 예외나 isError로 표현하므로 둘 다 거부 결과로 검사한다.
    let rejected = false;
    try { rejected = (await client.callTool({ name: 'get_reference', arguments: args })).isError === true; }
    catch { rejected = true; }
    assert.equal(rejected, true);
  }
  for (const [path, expected] of before) assert.equal(hash(await readFile(path)), expected);
  assert.equal(stderr, '');
});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'viewgrain-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'references');
  const set = join(root, 'scene-001', 'v1');
  await cp(join(referenceRoot, 'scene-001', 'v1'), set, { recursive: true });
  return { directory, root, set };
}

test('누락, 변조, 큰 이미지와 폴더 밖 링크를 성공 처리하지 않는다', async t => {
  const { directory, root, set } = await fixture(t);
  const home = join(set, 'home.png');
  await writeFile(home, 'broken');
  await assert.rejects(getReference(scene, root), { code: 'INTEGRITY_MISMATCH' });
  await truncate(home, 4 * 1024 * 1024 + 1);
  await assert.rejects(getReference(scene, root), { code: 'TOO_LARGE' });
  await rm(home);
  await assert.rejects(getReference(scene, root), { code: 'NOT_FOUND' });
  const outside = join(directory, 'outside.png');
  await writeFile(outside, 'outside');
  await symlink(outside, home);
  await assert.rejects(getReference(scene, root), { code: 'INVALID_PATH' });
  await rm(home);
  await symlink(join(set, 'prompts.md'), home);
  await assert.rejects(getReference(scene, root), { code: 'INVALID_PATH' });
});

test('읽기 권한 거부를 파일 누락과 구분한다', { skip: process.platform === 'win32' }, async t => {
  const { root, set } = await fixture(t);
  const home = join(set, 'home.png');
  await chmod(home, 0);
  try { await assert.rejects(getReference(scene, root), { code: 'ACCESS_DENIED' }); }
  finally { await chmod(home, 0o600); }
});

test('목록의 경로 변경과 잘못된 버전 및 중복 ID를 거부한다', async t => {
  const { root, set } = await fixture(t);
  const path = join(set, 'manifest.json');
  const original = JSON.parse(await readFile(path, 'utf8'));
  for (const change of [
    manifest => { manifest.images[0].file = '../outside.png'; },
    manifest => { manifest.generation.prompt_record = '.env'; },
    manifest => { manifest.version = 2; },
    manifest => { manifest.images[1].id = manifest.images[0].id; },
  ]) {
    const manifest = structuredClone(original);
    change(manifest);
    await writeFile(path, JSON.stringify(manifest));
    await assert.rejects(getReferenceSet(scene, root), { code: 'INVALID_MANIFEST' });
  }
  await writeFile(path, '{');
  await assert.rejects(getReferenceSet(scene, root), { code: 'INVALID_MANIFEST' });
});
