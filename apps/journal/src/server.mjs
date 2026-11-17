import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Store } from './store.mjs';
import { check } from './model.mjs';
import { appRoot, config } from './config.mjs';
import { connections, readDocument } from './repository.mjs';
import { exportMarkdown } from './export.mjs';

export async function startServer(options) {
  const store = new Store(options.directory);
  await store.initialize();
  const token = randomBytes(32).toString('hex');
  const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/styles.css', ['styles.css', 'text/css']]]);
  let origin;
  const server = createServer(async (request, response) => {
    const send = (status, content, type = 'application/json') => {
      response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Referrer-Policy': 'no-referrer' });
      response.end(type === 'application/json' ? JSON.stringify(content) : content);
    };
    try {
      check(request.headers.host === new URL(origin).host, '허용되지 않은 호스트입니다.', 403);
      check(!request.headers.origin || request.headers.origin === origin, '다른 사이트에서 접근할 수 없습니다.', 403);
      check(!request.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(request.headers['sec-fetch-site']), '외부 사이트의 요청을 거절했습니다.', 403);
      const url = new URL(request.url, origin);
      if (request.method === 'GET' && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        send(200, await readFile(join(appRoot, 'web', file)), type);
      } else if (request.method === 'GET' && url.pathname === '/api/state') {
        const state = await store.read();
        send(200, { state, token, connections: await connections(options.repository, state.apps) });
      } else if (request.method === 'POST' && url.pathname === '/api/command') {
        check(request.headers['x-journal-token'] === token, '연결을 새로고침한 뒤 다시 저장하세요.', 403);
        check(request.headers['content-type'] === 'application/json', 'JSON 입력만 받습니다.', 415);
        let size = 0; const chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          check(size <= 32 * 1024 * 1024, '입력이 너무 큽니다.', 413);
          chunks.push(chunk);
        }
        let command;
        try { command = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { check(false, 'JSON 형식이 올바르지 않습니다.'); }
        send(200, await store.execute(command));
      } else if (request.method === 'GET' && url.pathname === '/api/backup') {
        response.setHeader('Content-Disposition', 'attachment; filename="for-me-journal-backup.json"');
        send(200, await store.read());
      } else if (request.method === 'GET' && url.pathname === '/api/export') {
        response.setHeader('Content-Disposition', 'attachment; filename="for-me-journal.md"');
        send(200, exportMarkdown(await store.read(), Object.fromEntries(url.searchParams)), 'text/markdown');
      } else if (request.method === 'GET' && url.pathname === '/api/document') {
        const app = (await store.read()).apps.find(item => item.id === url.searchParams.get('appId'));
        check(app, '앱을 찾을 수 없습니다.', 404);
        send(200, await readDocument(options.repository, app, url.searchParams.get('name')), 'text/plain');
      } else send(404, { error: '경로를 찾을 수 없습니다.' });
    } catch (error) {
      const status = error.code === 'ENOENT' ? 404 : error.status ?? 500;
      send(status, { error: status === 500 ? '저장 또는 읽기에 실패했습니다. 입력을 보존한 채 저장 폴더를 확인하세요.' : error.message });
    }
  });
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', done);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, store };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer(config(process.argv.slice(2))).then(({ origin }) => console.log(`for-me 기록: ${origin}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
