// 선택한 자료의 사본만 전달한다. 다른 도구를 실행하거나 설치 경로를 참조하지 않는다.
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rename, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getReference, getReferenceSet, referenceRoot, validateManifest, maxTextBytes } from './catalog.mjs';
import { idPattern, legacySetIds, setIdMaxLength } from './identifiers.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const extensions = /\.(json|md|html|tsx|ts|js|css|png|jpg|jpeg|svg|woff2)$/;
function safeName(name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || !extensions.test(name) || name.split('/').some(part => !part || part.startsWith('.'))) throw new Error('잘못된 자료 경로입니다');
  return name;
}
async function read(directory, name, limit = 16 * 1024 * 1024) {
  name = safeName(name);
  let target = directory;
  for (const part of name.split('/')) {
    target = join(target, part);
    if ((await lstat(target)).isSymbolicLink()) throw new Error('자료의 심볼릭 링크는 지원하지 않습니다');
  }
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('자료 폴더의 심볼릭 링크는 지원하지 않습니다');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    if (!(await handle.stat()).isFile()) throw new Error('일반 파일만 읽을 수 있습니다');
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit) throw new Error('자료가 크기 한도를 초과했습니다');
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}
async function writeNew(directory, files) {
  try {
    await lstat(directory);
    for (const [name, data] of Object.entries(files)) if (!(await read(directory, name)).equals(data)) throw new Error('기존 버전은 덮어쓰지 않습니다');
    return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(directory), { recursive: true });
  const temporary = await mkdtemp(join(dirname(directory), '.transfer-'));
  try {
    for (const [name, data] of Object.entries(files)) {
      const target = join(temporary, safeName(name));
      await mkdir(dirname(target), { recursive: true });
      const handle = await open(target, 'wx');
      try { await handle.writeFile(data); } finally { await handle.close(); }
    }
    await rename(temporary, directory);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function exportReference({ set_id, version, image_id }, output, root = referenceRoot) {
  const set = await getReferenceSet({ set_id, version }, root);
  const entry = set.images.find(image => image.id === image_id || image.aliases?.includes(image_id));
  if (!entry) throw new Error('이미지를 찾을 수 없습니다');
  const result = await getReference({ set_id: set.id, version, image_id: entry.id }, root);
  const files = { 'reference.png': Buffer.from(result.image.data, 'base64') };
  const artifacts = set.implementation?.artifacts ?? {};
  for (const [name, expected] of Object.entries(artifacts)) {
    const data = await read(join(root, set.id, `v${version}`), name);
    if (hash(data) !== expected) throw new Error('구현 자료가 등록 정보와 다릅니다');
    files[name] = data;
  }
  files['reference.json'] = json({
    format_version: 1, kind: 'ui-reference', title: set.title,
    source: { provider: 'viewgrain', set_id: set.id, version, image_id: entry.id, parent: set.implementation?.source ?? null },
    selection: set.selection, notes: set.design_notes_text,
    ...(set.implementation ? { viewport: set.implementation.viewport, display_state: set.implementation.display_state } : {}),
    image: { file: 'reference.png', width: entry.width, height: entry.height, sha256: entry.sha256 }, artifacts,
  });
  await writeNew(resolve(output), files);
  return { output: resolve(output) };
}

export async function importReference(input, setId, version, root = referenceRoot) {
  if (typeof setId !== 'string' || !idPattern.test(setId) || setId.length > setIdMaxLength || legacySetIds.has(setId) || !Number.isSafeInteger(version) || version < 1) throw new Error('묶음 ID와 버전을 확인하세요. 이전 묶음 ID는 예약돼 있습니다');
  const meta = JSON.parse(await read(input, 'reference.json', 128 * 1024));
  if (!meta || typeof meta !== 'object' || meta.format_version !== 1 || meta.kind !== 'ui-reference' || typeof meta.title !== 'string' || !meta.title || !meta.image || typeof meta.image !== 'object') throw new Error('지원하지 않는 레퍼런스 묶음입니다');
  const image = await read(input, meta.image.file, 4 * 1024 * 1024);
  if (hash(image) !== meta.image.sha256 || image.length < 24 || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || image.toString('ascii', 12, 16) !== 'IHDR' || image.readUInt32BE(16) !== meta.image.width || image.readUInt32BE(20) !== meta.image.height) throw new Error('이미지와 등록 정보가 다릅니다');
  const artifacts = meta.artifacts ?? {};
  if (typeof artifacts !== 'object' || Array.isArray(artifacts) || Object.keys(artifacts).length > 100) throw new Error('구현 자료 목록을 확인하세요');
  const files = { 'screen.png': image };
  for (const [name, expected] of Object.entries(artifacts)) {
    if (!name.startsWith('implementation/')) throw new Error('구현 자료는 implementation 폴더 안에 있어야 합니다');
    const data = await read(input, name);
    if (hash(data) !== expected) throw new Error('구현 자료가 등록 정보와 다릅니다');
    files[name] = data;
  }
  if (Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0) > 64 * 1024 * 1024) throw new Error('묶음이 크기 한도를 초과했습니다');
  const selection = meta.selection ?? { user_statement: '', scope: '자료 가져오기' };
  const date = new Date().toISOString().slice(0, 10);
  const manifest = {
    format_version: 1, id: setId, version, title: meta.title, registered_at: date,
    domain: 'lab-study', platforms: [meta.viewport?.width <= 600 ? 'mobile' : 'desktop-web'],
    status: { generated: false, selected_by_user: selection.satisfaction === 'adopted', implementation_verified: false, mcp_delivery_verified: false },
    selection,
    generation: { source: 'imported-reference', model: null, tool: null, prompt_record: 'prompts.md', exact_submitted_prompts_verified: false },
    design_notes: 'README.md',
    implementation: { source: meta.source ?? null, viewport: meta.viewport ?? null, display_state: meta.display_state ?? null, artifacts },
    images: [{ id: 'screen', screen: 'adopted-screen', orientation: meta.image.width > meta.image.height ? 'landscape' : 'portrait', file: 'screen.png', width: meta.image.width, height: meta.image.height, bytes: image.length, sha256: hash(image) }],
  };
  validateManifest(manifest, setId, version);
  files['manifest.json'] = json(manifest);
  files['README.md'] = Buffer.from(`# ${meta.title}\n\n${meta.notes ?? ''}\n\n가져온 전체 화면입니다. 채택과 실제 기기 검증은 별개입니다.\n`);
  files['prompts.md'] = Buffer.from('# 생성 기록\n\n코드 시편에서 내보낸 자료는 이미지 생성 프롬프트가 없습니다. 출처와 표시 상태는 manifest의 implementation에 보존합니다.\n');
  const target = join(root, setId, `v${version}`);
  // 등록 날짜와 관계없이 같은 입력의 재시도는 같은 결과를 가리킨다.
  try { const existing = JSON.parse(await read(target, 'manifest.json')); manifest.registered_at = existing.registered_at; files['manifest.json'] = json(manifest); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const name of ['manifest.json', 'README.md', 'prompts.md']) {
    if (files[name].length > maxTextBytes) throw new Error('등록할 설명이 조회 크기 한도를 초과합니다');
  }
  await writeNew(target, files);
  return { set_id: setId, version, image_id: 'screen' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, ...args] = process.argv.slice(2);
  try {
    if (action === 'export' && args.length === 4) console.log(JSON.stringify(await exportReference({ set_id: args[0], version: Number(args[1]), image_id: args[2] }, args[3])));
    else if (action === 'import' && args.length === 3) console.log(JSON.stringify(await importReference(resolve(args[0]), args[1], Number(args[2]))));
    else throw new Error('사용법: node src/transfer.mjs export <묶음> <버전> <이미지> <출력 폴더> 또는 import <자료 폴더> <새 묶음> <버전>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
