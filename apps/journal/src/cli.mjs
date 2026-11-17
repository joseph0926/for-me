import { Store } from './store.mjs';
import { config } from './config.mjs';
import { connections } from './repository.mjs';
import { exportMarkdown } from './export.mjs';

const [action = 'help', ...args] = process.argv.slice(2);
try {
  if (action === 'help') {
    console.log('사용: node src/cli.mjs <init|read|write|backup|export|connections> [--data-dir 폴더] [--repo-root 저장소]\nwrite: 명령 JSON을 표준 입력으로 전달합니다. 문서는 docs/agent.md를 참고하세요.');
  } else {
    const options = config(args);
    const store = new Store(options.directory);
    let result;
    if (action === 'init') { await store.initialize(); result = { initialized: true, directory: store.directory }; }
    else if (action === 'write') {
      const chunks = []; let size = 0;
      for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw new Error('입력이 32 MiB를 초과합니다.');
        chunks.push(chunk);
      }
      result = await store.execute(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } else if (['read', 'backup'].includes(action)) result = await store.read();
    else if (action === 'connections') result = await connections(options.repository, (await store.read()).apps);
    else if (action === 'export') result = exportMarkdown(await store.read());
    else throw new Error('지원하지 않는 명령입니다. help를 확인하세요.');
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(JSON.stringify({ error: error.message, status: error.status ?? 500 }));
  process.exitCode = 1;
}
