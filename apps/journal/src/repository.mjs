import { lstat, realpath, readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { check } from './model.mjs';

export const documents = ['README.md', 'docs/scope.md', 'docs/research.md', 'docs/qa-issues.md', 'docs/verification.md'];

export async function documentPath(root, app, name) {
  check(documents.includes(name) && app.folder, '허용된 앱 문서만 열 수 있습니다.', 404);
  const canonicalRoot = await realpath(root);
  const path = resolve(canonicalRoot, app.folder, name);
  const relativePath = relative(resolve(canonicalRoot, 'apps'), path);
  check(!relativePath.startsWith('..') && !isAbsolute(relativePath), '저장소 밖 문서를 열 수 없습니다.', 403);
  const info = await lstat(path);
  check(info.isFile() && !info.isSymbolicLink() && info.size < 2 * 1024 * 1024 && await realpath(path) === path, '문서의 경로나 형식을 확인하세요.', 403);
  return path;
}

export async function connections(root, apps) {
  return Promise.all(apps.map(async app => ({
    appId: app.id,
    documents: await Promise.all(documents.map(async name => {
      try { await documentPath(root, app, name); return { name, available: true }; }
      catch { return { name, available: false }; }
    })),
  })));
}

export async function readDocument(root, app, name) {
  return readFile(await documentPath(root, app, name), 'utf8');
}
