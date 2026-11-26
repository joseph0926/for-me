import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";

import { deliveriesNotice } from "../scripts/check.ts";
import { defaultOutDir, defaultPython, parseArgs, refine, SHELL_FAILED, stamp, tasteArgs, validateStates } from "../scripts/refine.ts";

const root = join(import.meta.dirname, "..");
const temps: string[] = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "today-ref-refine-"));
  temps.push(dir);
  return dir;
}

describe("refine 인자", () => {
  test("주제 id와 선택 옵션을 읽는다", () => {
    assert.deepEqual(parseArgs(["2026-11-18-blog"]), { topicId: "2026-11-18-blog", build: true, out: null });
    assert.deepEqual(parseArgs(["--no-build", "2026-11-18-blog", "--out", "x"]), { topicId: "2026-11-18-blog", build: false, out: "x" });
  });

  test("id가 없거나 둘이거나 모르는 옵션이면 거절한다", () => {
    assert.throws(() => parseArgs([]), /사용/);
    assert.throws(() => parseArgs(["a", "b"]), /하나만/);
    assert.throws(() => parseArgs(["a", "--fast"]), /모르는 옵션/);
    assert.throws(() => parseArgs(["a", "--out"]), /--out/);
  });

  test("결과 폴더는 완성작 아래 .refine/<실행 시각>이고 콜론이 없다", () => {
    const date = new Date(2026, 10, 26, 9, 5, 7);
    assert.equal(stamp(date), "2026-11-26-090507");
    assert.equal(defaultOutDir("/r", "2026-11-18-blog", date), join("/r", "works", "2026-11-18-blog", ".refine", "2026-11-26-090507"));
  });

  test("taste.py refine에 주소(위치 인자), 상태 파일, 결과 폴더를 넘긴다", () => {
    assert.deepEqual(tasteArgs("/t/taste.py", "http://127.0.0.1:4417/", "/w/states.json", "/w/.refine/x"), [
      "-B", "/t/taste.py", "refine", "http://127.0.0.1:4417/", "--states", "/w/states.json", "--out", "/w/.refine/x",
    ]);
  });
});

describe("상태 파일 형식", () => {
  const example = {
    viewports: [{ name: "desktop", width: 1440, height: 900 }],
    states: [
      { id: "home", label: "첫 화면", path: "/" },
      {
        id: "reveal",
        label: "카드 공개",
        path: "/",
        steps: [
          { click: { role: "button", name: "무료 선수 팩 받기" } },
          { hover: { text: "카드" } },
          { fill: { selector: "input" }, value: "abc" },
          { press: "Escape" },
          { scroll: 600 },
          { wait: 2600 },
        ],
      },
    ],
  };

  test("사양의 예시를 받는다", () => {
    assert.deepEqual(validateStates(example), []);
    assert.deepEqual(validateStates({ states: example.states }), []);
  });

  test("틀린 단계와 겹치는 id를 하나씩 알린다", () => {
    const errors = validateStates({
      states: [
        { id: "home", label: "첫 화면", path: "/" },
        { id: "home", label: "다시", path: "x" },
        { id: "a", label: "a", path: "/", steps: [{ click: { role: "button", text: "둘 다" } }, { wait: "1초" }, { fill: { selector: "input" } }, { tap: {} }] },
      ],
    });
    assert.equal(errors.length, 6, errors.join("\n"));
  });

  test("완성작마다 2~6개 상태의 상태 파일이 있다", () => {
    const works = readdirSync(join(root, "works"), { withFileTypes: true }).filter((entry) => entry.isDirectory());
    assert.ok(works.length > 0);
    for (const work of works) {
      const path = join(root, "works", work.name, "states.json");
      assert.ok(existsSync(path), `${work.name}에 states.json이 없습니다`);
      const parsed = JSON.parse(readFileSync(path, "utf8")) as { states: unknown[] };
      assert.deepEqual(validateStates(parsed), [], work.name);
      assert.ok(parsed.states.length >= 2 && parsed.states.length <= 6, `${work.name}: 상태 ${parsed.states.length}개`);
    }
  });
});

describe("원장 건너뜀 안내", () => {
  test("원장을 읽었으면 조용하고, 못 읽었으면 경로와 환경변수를 알린다", () => {
    assert.equal(deliveriesNotice("/x/deliveries.jsonl", new Set()), null);
    assert.match(deliveriesNotice("/x/deliveries.jsonl", null) ?? "", /건너뜀.*\/x\/deliveries\.jsonl.*TODAY_REF_TASTE_DELIVERIES/);
  });
});

// 실제 vite와 tastepin 대신 가짜를 둬서 껍데기의 서버 기동, 인자 전달, 종료 코드 전달, 서버 정리만 본다.
describe("refine 실행", () => {
  function fakeWorkspace() {
    const dir = tempDir();
    const work = join(dir, "works", "2026-11-26-fake");
    mkdirSync(join(work, "dist"), { recursive: true });
    mkdirSync(join(work, "node_modules", "vite", "bin"), { recursive: true });
    writeFileSync(join(work, "package.json"), "{}");
    writeFileSync(join(work, "dist", "index.html"), "<!doctype html>");
    writeFileSync(join(work, "states.json"), JSON.stringify({ states: [{ id: "home", label: "첫 화면", path: "/" }, { id: "b", label: "b", path: "/" }] }));
    writeFileSync(
      join(work, "node_modules", "vite", "bin", "vite.js"),
      `const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
require("node:http").createServer((_, res) => res.end("ok")).listen(port, "127.0.0.1");`,
    );
    const record = join(dir, "args.json");
    const tastePy = join(dir, "taste.py");
    writeFileSync(
      tastePy,
      `import json, sys, urllib.request
url = sys.argv[sys.argv.index("refine") + 1]
body = urllib.request.urlopen(url).read().decode()
json.dump({"argv": sys.argv[1:], "body": body}, open(${JSON.stringify(record)}, "w"))
sys.exit(1)
`,
    );
    return { dir, work, record, tastePy };
  }

  test("서버 주소를 넘기고 taste.py의 종료 코드를 그대로 돌려주며 서버를 닫는다", async () => {
    const { dir, work, record, tastePy } = fakeWorkspace();
    const out = join(dir, "out");
    const code = await refine({ topicId: "2026-11-26-fake", build: false, out }, { root: dir, tastePy, python: defaultPython, now: new Date() });
    assert.equal(code, 1);
    const { argv, body } = JSON.parse(readFileSync(record, "utf8")) as { argv: string[]; body: string };
    assert.equal(body, "ok");
    assert.deepEqual(argv.slice(0, 1), ["refine"]);
    assert.equal(argv[argv.indexOf("--states") + 1], join(work, "states.json"));
    assert.equal(argv[argv.indexOf("--out") + 1], out);
    assert.ok(existsSync(out));
    const url = argv[1];
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    await new Promise((done) => setTimeout(done, 300));
    await assert.rejects(fetch(url), "검사가 끝난 뒤에도 미리보기 서버가 남았습니다");
  });

  test("상태 파일, taste.py, 빌드 결과가 없으면 서버를 띄우지 않고 3으로 멈춘다", async () => {
    const { dir, work, tastePy } = fakeWorkspace();
    const env = { root: dir, tastePy, python: defaultPython, now: new Date() };
    const options = { topicId: "2026-11-26-fake", build: false, out: join(dir, "out") };
    assert.equal(await refine(options, { ...env, tastePy: join(dir, "없음.py") }), SHELL_FAILED);
    rmSync(join(work, "dist"), { recursive: true });
    assert.equal(await refine(options, env), SHELL_FAILED);
    writeFileSync(join(work, "states.json"), JSON.stringify({ states: [] }));
    assert.equal(await refine(options, env), SHELL_FAILED);
    assert.equal(await refine({ ...options, topicId: "2026-11-26-none" }, env), SHELL_FAILED);
  });
});
