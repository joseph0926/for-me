// 갤러리를 띄운다. 사용: node scripts/gallery.ts [vite 인자]
// 같은 사본에서 여러 세션이 오늘의레퍼런스를 돌리면 먼저 띄운 갤러리가 새 주제도 보여 주므로(vite.config.ts의 감시),
// 이미 떠 있으면 새로 띄우지 않고 그 주소를 알린다. 포트는 strictPort라 두 번째 실행은 그냥 실패하기 때문이다.
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

export const galleryPort = 4319;
// 갤러리 서버가 자기가 어느 사본의 topics/를 보여 주는지 답하는 경로. vite.config.ts가 이 값을 쓴다.
export const identityPath = "/__today-ref";
export const galleryApp = "today-ref-gallery";

export interface GalleryIdentity {
  app: string;
  topicsDir: string;
}

// 포트에서 받은 응답. none은 아무도 듣지 않는 포트다.
export type Probe = { kind: "none" } | { kind: "gallery"; identity: GalleryIdentity } | { kind: "other"; detail: string };

export type Decision = { kind: "start" } | { kind: "reuse"; url: string } | { kind: "stop"; message: string };

export function topicsDirOf(root: string): string {
  return resolve(root, "topics");
}

export async function probe(port: number, timeoutMs = 1500): Promise<Probe> {
  let response: Response;
  try {
    response = await fetch(`http://localhost:${port}${identityPath}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    if (code === "ECONNREFUSED") return { kind: "none" };
    return { kind: "other", detail: `응답이 없습니다 (${code ?? (error as Error).name})` };
  }
  const body = await response.text();
  if (response.ok) {
    try {
      const identity = JSON.parse(body) as Partial<GalleryIdentity>;
      if (identity.app === galleryApp && typeof identity.topicsDir === "string") {
        return { kind: "gallery", identity: { app: identity.app, topicsDir: identity.topicsDir } };
      }
    } catch {
      // 오늘의레퍼런스 갤러리가 아닌 서버의 응답이다.
    }
  }
  return { kind: "other", detail: `${identityPath}에 갤러리 응답이 없습니다 (HTTP ${response.status})` };
}

export function decide(result: Probe, topicsDir: string, port: number, platform = process.platform): Decision {
  const url = `http://localhost:${port}`;
  if (result.kind === "none") return { kind: "start" };
  if (result.kind === "other") {
    return {
      kind: "stop",
      message:
        `${port}번 포트를 오늘의레퍼런스 갤러리가 아닌 프로그램이 쓰고 있습니다. ${result.detail}. ` +
        `이 변경 전에 띄운 갤러리일 수도 있습니다. 그 프로그램을 끄거나 --port로 다른 포트를 줍니다`,
    };
  }
  if (samePath(result.identity.topicsDir, topicsDir, platform)) return { kind: "reuse", url };
  return {
    kind: "stop",
    message:
      `${port}번 포트의 갤러리는 다른 사본(${result.identity.topicsDir})의 주제를 보여 줍니다. ` +
      `이 사본(${topicsDir})의 주제는 그 갤러리에 나오지 않습니다. 그 갤러리를 끄거나 --port로 다른 포트를 줍니다`,
  };
}

// Windows 경로는 대소문자를 구분하지 않아 드라이브 문자 표기만 달라도 다른 사본으로 읽히지 않게 한다.
function samePath(a: string, b: string, platform: string): boolean {
  const normalize = (path: string) => (platform === "win32" ? resolve(path).toLowerCase() : resolve(path));
  return normalize(a) === normalize(b);
}

if (import.meta.main) {
  const root = join(import.meta.dirname, "..");
  const viteArgs = process.argv.slice(2);
  const { values } = parseArgs({ args: viteArgs, options: { port: { type: "string" } }, strict: false });
  const port = typeof values.port === "string" ? Number(values.port) : galleryPort;
  if (!Number.isInteger(port) || port <= 0) throw new Error(`--port는 포트 번호여야 합니다: ${String(values.port)}`);
  const decision = decide(await probe(port), topicsDirOf(root), port);

  if (decision.kind === "reuse") {
    console.log(`갤러리가 이미 이 사본으로 실행 중입니다: ${decision.url}/#<주제 id>`);
    console.log("새 주제는 그 갤러리에 바로 나옵니다. 띄운 세션이 끝나 갤러리가 꺼지면 이 명령을 다시 실행합니다");
  } else if (decision.kind === "stop") {
    console.error(decision.message);
    process.exitCode = 1;
  } else {
    const galleryDir = join(root, "gallery");
    const vite = join(galleryDir, "node_modules", "vite", "bin", "vite.js");
    const child = spawn(process.execPath, [vite, ...viteArgs], { cwd: galleryDir, stdio: "inherit" });
    child.on("exit", (code, signal) => {
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }
}
