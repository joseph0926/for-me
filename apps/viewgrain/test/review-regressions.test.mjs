import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const runFile = promisify(execFile);
const setArgs = { set_id: 'scene-001', version: 1 };

async function fixtureServer(t) {
  const directory = await mkdtemp(join(tmpdir(), 'viewgrain-review-'));
  const client = new Client({ name: 'viewgrain-review-test', version: '0.1.0' });
  t.after(async () => {
    try { await client.close(); }
    finally { await rm(directory, { recursive: true, force: true }); }
  });
  await cp(join(appRoot, 'src'), join(directory, 'src'), { recursive: true });
  const set = join(directory, 'references', 'video-streaming-scene', 'v1');
  await cp(join(appRoot, 'references', 'video-streaming-scene', 'v1'), set, { recursive: true });
  await symlink(join(appRoot, 'node_modules'), join(directory, 'node_modules'), 'junction');
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(directory, 'src/server.mjs')] }));
  return { client, set };
}

test('FIFO 이미지와 기록 파일을 대기 없이 거부한 뒤 일반 파일을 계속 조회한다', { skip: process.platform === 'win32', timeout: 20000 }, async t => {
  const { client, set } = await fixtureServer(t);
  for (const name of ['home.png', 'manifest.json', 'README.md', 'prompts.md']) {
    const path = join(set, name);
    const original = await readFile(path);
    await rm(path);
    await runFile('mkfifo', [path]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await client.callTool({ name: 'get_reference', arguments: { ...setArgs, image_id: 'scene-001-home' } }, { timeout: 2000 });
      assert.equal(result.isError, true);
      assert.equal(JSON.parse(result.content[0].text).code, 'INVALID_FILE');
      assert.ok(result.content.every(item => item.type !== 'image'));
    }
    await rm(path);
    await writeFile(path, original);
    const restored = await client.callTool({ name: 'get_reference', arguments: { ...setArgs, image_id: 'scene-001-home' } });
    assert.ok(!restored.isError);
    assert.equal(restored.content.filter(item => item.type === 'image').length, 1);
  }
});

test('목록이 반환한 150자 ID를 상세 조회하고 151자 ID는 목록에서 거부한다', { timeout: 15000 }, async t => {
  const { client, set } = await fixtureServer(t);
  const path = join(set, 'manifest.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.images[0].id = 'a'.repeat(150);
  await writeFile(path, JSON.stringify(manifest));
  const list = await client.callTool({ name: 'get_reference_set', arguments: setArgs });
  assert.ok(!list.isError);
  const listedId = list.structuredContent.images[0].id;
  assert.equal(listedId, 'a'.repeat(150));
  const image = await client.callTool({ name: 'get_reference', arguments: { ...setArgs, image_id: listedId } });
  assert.ok(!image.isError);
  assert.equal(image.structuredContent.image_id, listedId);
  assert.equal(image.content.filter(item => item.type === 'image').length, 1);
  manifest.images[0].id = 'a'.repeat(151);
  await writeFile(path, JSON.stringify(manifest));
  const invalidList = await client.callTool({ name: 'get_reference_set', arguments: setArgs });
  assert.equal(invalidList.isError, true);
  assert.equal(JSON.parse(invalidList.content[0].text).code, 'INVALID_MANIFEST');
});
