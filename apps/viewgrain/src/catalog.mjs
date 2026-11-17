import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { idPattern, imageIdMaxLength, setIdMaxLength } from './identifiers.mjs';

export const referenceRoot = fileURLToPath(new URL('../references/', import.meta.url));
const maxImageBytes = 4 * 1024 * 1024;
const maxTextBytes = 128 * 1024;

export class ReferenceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function requireValue(condition, code, message) {
  if (!condition) throw new ReferenceError(code, message);
}

function contained(parent, child) {
  const path = relative(parent, child);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function readBoundedFile(root, directory, name, limit) {
  let handle;
  try {
    const canonicalRoot = await realpath(root);
    const canonicalDirectory = await realpath(directory);
    requireValue(contained(canonicalRoot, canonicalDirectory), 'INVALID_PATH', '자료 경로가 보관 폴더 밖을 가리킵니다.');
    requireValue(canonicalDirectory === resolve(canonicalRoot, relative(resolve(root), resolve(directory))),
      'INVALID_PATH', '자료 폴더의 심볼릭 링크는 지원하지 않습니다.');
    const canonicalFile = await realpath(resolve(canonicalDirectory, name));
    requireValue(contained(canonicalDirectory, canonicalFile), 'INVALID_PATH', '파일 경로가 묶음 폴더 밖을 가리킵니다.');
    requireValue(canonicalFile === resolve(canonicalDirectory, name), 'INVALID_PATH', '자료 파일의 심볼릭 링크는 지원하지 않습니다.');
    const entry = await lstat(canonicalFile);
    requireValue(entry.isFile(), 'INVALID_FILE', '일반 파일만 읽을 수 있습니다.');
    // 사전 검사 뒤 FIFO로 교체돼도 open이 기다리지 않게 하고, 열린 파일을 다시 검사한다.
    const flags = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOFOLLOW ?? 0);
    handle = await open(canonicalFile, flags);
    const stat = await handle.stat();
    requireValue(stat.isFile(), 'INVALID_FILE', '일반 파일만 읽을 수 있습니다.');
    requireValue(stat.size <= limit, 'TOO_LARGE', '자료가 현재 응답 크기 한도를 초과합니다.');
    // 읽는 동안 파일이 커져도 한도를 넘는 데이터를 메모리에 적재하지 않는다.
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    requireValue(length <= limit, 'TOO_LARGE', '자료가 현재 응답 크기 한도를 초과합니다.');
    return buffer.subarray(0, length);
  } catch (error) {
    if (error instanceof ReferenceError) throw error;
    if (error.code === 'ENOENT') throw new ReferenceError('NOT_FOUND', '요청한 묶음, 버전 또는 파일을 찾을 수 없습니다.');
    if (error.code === 'EACCES' || error.code === 'EPERM') throw new ReferenceError('ACCESS_DENIED', '자료를 읽을 권한이 없습니다.');
    throw new ReferenceError('READ_FAILED', '자료를 읽지 못했습니다.');
  } finally {
    await handle?.close();
  }
}

async function loadSet(root, setId, version) {
  requireValue(typeof setId === 'string' && idPattern.test(setId) && setId.length <= setIdMaxLength && Number.isSafeInteger(version) && version > 0,
    'INVALID_INPUT', '묶음 식별자와 양의 정수 버전이 필요합니다.');
  const directory = resolve(root, setId, `v${version}`);
  const bytes = await readBoundedFile(root, directory, 'manifest.json', maxTextBytes);
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new ReferenceError('INVALID_MANIFEST', '자료 목록의 JSON 형식이 잘못됐습니다.');
  }
  requireValue(manifest?.format_version === 1 && manifest.id === setId && manifest.version === version &&
    typeof manifest.title === 'string' && manifest.status && typeof manifest.status === 'object' &&
    manifest.selection && typeof manifest.selection === 'object' &&
    manifest.design_notes === 'README.md' && manifest.generation?.prompt_record === 'prompts.md' &&
    Array.isArray(manifest.images) && manifest.images.length > 0 && manifest.images.length <= 50,
  'INVALID_MANIFEST', '자료 목록의 식별자, 버전 또는 필수 기록이 잘못됐습니다.');
  const ids = new Set();
  for (const image of manifest.images) {
    requireValue(image && typeof image.id === 'string' && idPattern.test(image.id) && image.id.length <= imageIdMaxLength && !ids.has(image.id) &&
      typeof image.file === 'string' && /^[a-z0-9][a-z0-9-]*\.png$/.test(image.file) &&
      typeof image.screen === 'string' && ['portrait', 'landscape'].includes(image.orientation) &&
      Number.isSafeInteger(image.width) && image.width > 0 && Number.isSafeInteger(image.height) && image.height > 0 &&
      Number.isSafeInteger(image.bytes) && image.bytes > 0 && typeof image.sha256 === 'string' && /^[a-f0-9]{64}$/.test(image.sha256),
    'INVALID_MANIFEST', '이미지 식별자, 파일 이름 또는 무결성 기록이 잘못됐습니다.');
    ids.add(image.id);
  }
  return { directory, manifest };
}

export async function getReferenceSet({ set_id, version }, root = referenceRoot) {
  const { directory, manifest } = await loadSet(root, set_id, version);
  const notes = await readBoundedFile(root, directory, manifest.design_notes, maxTextBytes);
  return { ...manifest, design_notes_text: notes.toString('utf8') };
}

export async function getReference({ set_id, version, image_id, include_context = true }, root = referenceRoot) {
  const { directory, manifest } = await loadSet(root, set_id, version);
  const image = manifest.images.find(item => item.id === image_id);
  requireValue(image, 'NOT_FOUND', '요청한 이미지가 이 묶음과 버전에 없습니다.');
  const bytes = await readBoundedFile(root, directory, image.file, maxImageBytes);
  const hash = createHash('sha256').update(bytes).digest('hex');
  requireValue(bytes.length === image.bytes && hash === image.sha256 && bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) === image.width && bytes.readUInt32BE(20) === image.height,
  'INTEGRITY_MISMATCH', '이미지가 등록된 바이트, 해시 또는 크기와 일치하지 않습니다.');
  const metadata = { set_id, version, image_id, width: image.width, height: image.height, sha256: hash };
  if (include_context) {
    const [notes, prompts] = await Promise.all([
      readBoundedFile(root, directory, manifest.design_notes, maxTextBytes),
      readBoundedFile(root, directory, manifest.generation.prompt_record, maxTextBytes),
    ]);
    Object.assign(metadata, {
      title: manifest.title, screen: image.screen, orientation: image.orientation,
      status: manifest.status, selection: manifest.selection, generation: manifest.generation,
      design_notes_text: notes.toString('utf8'), prompt_record_text: prompts.toString('utf8'),
    });
  }
  return { metadata, image: { type: 'image', mimeType: 'image/png', data: bytes.toString('base64') } };
}
