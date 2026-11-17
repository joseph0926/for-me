import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export function config(argv) {
  const result = { directory: resolve(appRoot, 'data'), repository: resolve(appRoot, '../..'), port: 4318 };
  for (let i = 0; i < argv.length; i += 2) {
    const key = { '--data-dir': 'directory', '--repo-root': 'repository', '--port': 'port' }[argv[i]];
    if (!key || !argv[i + 1]) throw new Error('옵션: --data-dir <폴더> --repo-root <저장소> --port <포트>');
    result[key] = key === 'port' ? Number(argv[i + 1]) : resolve(argv[i + 1]);
  }
  if (!Number.isInteger(result.port) || result.port < 0 || result.port > 65535) throw new Error('포트가 올바르지 않습니다.');
  return result;
}
