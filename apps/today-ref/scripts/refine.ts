// 완성작 하나를 빌드하고 미리보기 서버에 띄워 tastepin의 `taste.py refine`에 넘긴다.
// 사용: node scripts/refine.ts <주제 id> [--no-build] [--out <폴더>]
//
// 이 스크립트는 빌드, 서버, 산출물 위치만 맡는 껍데기다. 스크린숏, 기계 검사, lint 측정은 taste.py refine이
// 대상 저장소와 무관하게 하고(URL과 상태 파일만 받음), AI 슬롭 판단과 수정은 docs/refine.md 절차가 맡는다.
// 그래서 고객 제품 저장소도 개발 서버 주소로 같은 taste.py refine을 부르면 같은 검사를 받는다.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { workFolder } from "../topic.ts";

// 취향 원장과 같은 실행 진입점을 쓴다. 이 진입점이 기록 폴더를 개인 원장으로 정하므로 tastepin을 직접 부르지 않는다
// (check.ts의 원장 경로와 같은 이유). 다른 사본은 환경변수로 덮는다.
export const defaultTastePy =
  process.env.TODAY_REF_TASTE_PY ?? join(homedir(), "dev", "p", "tools", "taste", "taste.py");

// Windows에는 python3가 없는 설치가 많다. 다른 실행 파일은 환경변수로 준다.
export const defaultPython = process.env.TODAY_REF_PYTHON ?? (process.platform === "win32" ? "python" : "python3");

// taste.py refine의 종료 코드(0 검사 완료, 1 fail 있음, 2 브라우저 실패)와 겹치지 않게, 이 껍데기에서 멈춘 경우는 3이다.
// 빌드 실패도 3이다. 스크린숏을 찍을 화면이 없어 검사 보고가 만들어지지 않았기 때문이다.
export const SHELL_FAILED = 3;

export interface RefineOptions {
  topicId: string;
  build: boolean;
  out: string | null;
}

export function parseArgs(argv: string[]): RefineOptions {
  let topicId: string | null = null;
  let build = true;
  let out: string | null = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--no-build") build = false;
    else if (arg === "--out") {
      const value = argv[++index];
      if (!value) throw new Error("--out에는 폴더를 줍니다");
      out = value;
    } else if (arg.startsWith("--")) throw new Error(`모르는 옵션입니다: ${arg}`);
    else if (topicId === null) topicId = arg;
    else throw new Error(`주제 id는 하나만 받습니다: ${arg}`);
  }
  if (topicId === null) throw new Error("사용: node scripts/refine.ts <주제 id> [--no-build] [--out <폴더>]");
  return { topicId, build, out };
}

// 바퀴마다 결과를 나란히 비교할 수 있게 실행 시각으로 폴더를 나눈다. Windows 경로에 쓸 수 없는 콜론은 넣지 않는다.
export function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function defaultOutDir(root: string, topicId: string, date: Date): string {
  return join(root, workFolder(topicId), ".refine", stamp(date));
}

// 주소는 위치 인자로 준다. 사양 초안의 `--url` 대신 tastepin이 lint와 같게 주소, 호스트:포트, HTML 파일을 한 자리에서 받는다.
export function tasteArgs(tastePy: string, url: string, states: string, out: string): string[] {
  return ["-B", tastePy, "refine", url, "--states", states, "--out", out];
}

// 상태 파일의 모양만 본다. 단계가 실제 화면에서 도는지는 taste.py refine이 state-failed로 알린다.
const stepKinds = ["click", "hover", "fill", "press", "wait", "scroll"] as const;

export function validateStates(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(input)) return ["최상위가 객체가 아닙니다"];
  if (input.viewports !== undefined) {
    if (!Array.isArray(input.viewports) || input.viewports.length === 0) errors.push("viewports는 비어 있지 않은 배열입니다");
    else
      input.viewports.forEach((viewport, index) => {
        const ok =
          isObject(viewport) &&
          typeof viewport.name === "string" &&
          Number.isInteger(viewport.width) &&
          Number.isInteger(viewport.height);
        if (!ok) errors.push(`viewports[${index}]: name, width, height가 필요합니다`);
      });
  }
  if (!Array.isArray(input.states) || input.states.length === 0) {
    errors.push("states는 비어 있지 않은 배열입니다");
    return errors;
  }
  const seen = new Set<string>();
  input.states.forEach((state, index) => {
    const at = `states[${index}]`;
    if (!isObject(state)) {
      errors.push(`${at}: 객체가 아닙니다`);
      return;
    }
    if (typeof state.id !== "string" || !/^[a-z0-9-]+$/.test(state.id)) errors.push(`${at}: id는 영문 소문자, 숫자, -입니다`);
    else if (seen.has(state.id)) errors.push(`${at}: id ${state.id}가 겹칩니다`);
    else seen.add(state.id);
    if (typeof state.label !== "string" || state.label === "") errors.push(`${at}: label이 필요합니다`);
    if (typeof state.path !== "string" || !state.path.startsWith("/")) errors.push(`${at}: path는 /로 시작합니다`);
    if (state.steps === undefined) return;
    if (!Array.isArray(state.steps)) {
      errors.push(`${at}: steps는 배열입니다`);
      return;
    }
    state.steps.forEach((step, stepIndex) => {
      const where = `${at}.steps[${stepIndex}]`;
      const kinds = isObject(step) ? stepKinds.filter((kind) => kind in step) : [];
      if (kinds.length !== 1 || !isObject(step)) {
        errors.push(`${where}: ${stepKinds.join(", ")} 중 하나만 둡니다`);
        return;
      }
      const kind = kinds[0];
      const value = step[kind];
      if (kind === "wait" || kind === "scroll") {
        if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${where}: ${kind}는 숫자입니다`);
      } else if (kind === "press") {
        if (typeof value !== "string" || value === "") errors.push(`${where}: press는 키 이름입니다`);
      } else {
        const targetError = checkTarget(value);
        if (targetError) errors.push(`${where}: ${targetError}`);
        if (kind === "fill" && typeof step.value !== "string") errors.push(`${where}: fill에는 value 문자열이 필요합니다`);
      }
    });
  });
  return errors;
}

function checkTarget(target: unknown): string | null {
  if (!isObject(target)) return "대상은 객체입니다";
  const ways = ["role", "text", "selector"].filter((key) => key in target);
  if (ways.length !== 1) return "대상은 role, text, selector 중 하나로 찾습니다";
  if (typeof target[ways[0]] !== "string") return `${ways[0]}는 문자열입니다`;
  if ("name" in target && typeof target.name !== "string") return "name은 문자열입니다";
  if ("exact" in target && typeof target.exact !== "boolean") return "exact는 true나 false입니다";
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 빈 포트를 운영체제에서 받는다. 닫은 뒤 미리보기 서버가 같은 포트를 잡기 전에 다른 프로세스가 가져가면
// --strictPort가 실패로 알리므로 다른 서버에 검사를 돌리는 일은 없다.
export function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      server.close(() => (port > 0 ? resolvePort(port) : reject(new Error("빈 포트를 받지 못했습니다"))));
    });
  });
}

export async function waitForServer(url: string, server: ChildProcess, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`미리보기 서버가 종료됐습니다 (종료 코드 ${server.exitCode})`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 아직 서버가 듣지 않는다
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`${timeoutMs / 1000}초 안에 ${url}이 열리지 않았습니다`);
}

// pnpm은 Windows에서 pnpm.cmd라 셸을 거쳐야 실행된다. 빌드는 스스로 끝나므로 셸을 거쳐도 정리할 자식이 남지 않는다.
function runBuild(workDir: string): number {
  const result = spawnSync("pnpm", ["run", "build"], { cwd: workDir, stdio: "inherit", shell: process.platform === "win32" });
  return result.status ?? SHELL_FAILED;
}

// 미리보기 서버는 셸 없이 vite를 node로 직접 띄운다. 셸을 거치면 Windows에서 kill이 셸만 끝내고 서버가 남는다.
function startPreview(workDir: string, port: number): ChildProcess {
  const vite = join(workDir, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(vite)) throw new Error(`${vite}가 없습니다. apps/today-ref에서 pnpm install을 먼저 합니다`);
  return spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: workDir,
    stdio: ["ignore", "ignore", "inherit"],
  });
}

function runTaste(python: string, args: string[]): Promise<number> {
  return new Promise((done) => {
    const child = spawn(python, args, { stdio: "inherit" });
    child.on("error", (error) => {
      console.error(`${python}를 실행하지 못했습니다: ${error.message}`);
      done(SHELL_FAILED);
    });
    child.on("exit", (code) => done(code ?? SHELL_FAILED));
  });
}

export interface RefineEnv {
  root: string;
  tastePy: string;
  python: string;
  now: Date;
}

export async function refine(options: RefineOptions, env: RefineEnv): Promise<number> {
  const workDir = join(env.root, workFolder(options.topicId));
  const states = join(workDir, "states.json");
  if (!existsSync(join(workDir, "package.json"))) return fail(`${workDir}가 없습니다`);
  if (!existsSync(states)) return fail(`${states}가 없습니다. README의 "상태로 가는 방법"을 옮겨 만듭니다`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(states, "utf8"));
  } catch (error) {
    return fail(`${states}를 읽지 못했습니다: ${(error as Error).message}`);
  }
  const errors = validateStates(parsed);
  if (errors.length > 0) return fail(`${states} 형식 오류:\n  ${errors.join("\n  ")}`);
  if (!existsSync(env.tastePy)) return fail(`${env.tastePy}가 없습니다. TODAY_REF_TASTE_PY로 실행 진입점을 줍니다`);

  if (options.build) {
    const code = runBuild(workDir);
    if (code !== 0) return fail(`빌드가 실패했습니다 (종료 코드 ${code})`);
  } else if (!existsSync(join(workDir, "dist", "index.html"))) {
    return fail(`--no-build인데 ${join(workDir, "dist")}에 빌드 결과가 없습니다`);
  }

  const out = resolve(options.out ?? defaultOutDir(env.root, options.topicId, env.now));
  mkdirSync(out, { recursive: true });
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;
  let server: ChildProcess;
  try {
    server = startPreview(workDir, port);
  } catch (error) {
    return fail((error as Error).message);
  }
  // 이 프로세스가 Ctrl+C로 끝나도 서버가 포트를 쥔 채 남지 않게 한다
  const stop = () => {
    if (server.exitCode === null) server.kill();
  };
  process.once("exit", stop);
  const interrupted = () => {
    stop();
    process.exit(130);
  };
  process.once("SIGINT", interrupted);
  try {
    await waitForServer(url, server);
    console.log(`${url}에서 검사합니다. 결과: ${out}`);
    return await runTaste(env.python, tasteArgs(env.tastePy, url, states, out));
  } catch (error) {
    return fail((error as Error).message);
  } finally {
    stop();
    process.off("exit", stop);
    process.off("SIGINT", interrupted);
  }
}

function fail(message: string): number {
  console.error(message);
  return SHELL_FAILED;
}

if (import.meta.main) {
  let options: RefineOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(SHELL_FAILED);
  }
  const root = join(import.meta.dirname, "..");
  process.exitCode = await refine(options, { root, tastePy: defaultTastePy, python: defaultPython, now: new Date() });
}
