import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";

import { capturesDir } from "../scripts/captures.ts";
import { checkWorkspace, defaultDeliveries } from "../scripts/check.ts";
import { collectTopics, limits, validateTopic } from "../topic.ts";

function reference(id: string, captures: string[] = []) {
  return {
    id,
    kind: "product",
    product: "Slack",
    source: "공식 사이트",
    title: "채널 목록",
    url: "https://slack.com/",
    checkedOn: "2026-11-18",
    captures,
    points: ["채널과 DM을 한 목록에서 구분"],
  };
}

function topic(overrides: Record<string, unknown> = {}) {
  return {
    id: "2026-11-18-chat",
    date: "2026-11-18",
    title: "채팅앱",
    platform: "app",
    brief: "",
    references: [reference("r1"), reference("r2")],
    selection: null,
    status: "selecting",
    ...overrides,
  };
}

function errorsOf(input: unknown, folder?: string): string[] {
  const result = validateTopic(input, folder);
  return result.ok ? [] : result.errors;
}

describe("주제 형식", () => {
  test("선택 전 주제를 받는다", () => {
    assert.deepEqual(errorsOf(topic(), "2026-11-18-chat"), []);
  });

  test("레퍼런스는 최대 개수까지 받고 하나 더 많으면 거절한다", () => {
    const at = (count: number) => Array.from({ length: count }, (_, index) => reference(`r${index + 1}`));
    assert.deepEqual(errorsOf(topic({ references: at(limits.references) })), []);
    assert.equal(errorsOf(topic({ references: at(limits.references + 1) })).length, 1);
  });

  test("폴더 이름과 다른 id를 거절한다", () => {
    assert.match(errorsOf(topic(), "2026-11-19-chat").join(), /폴더 이름/);
  });

  test("날짜로 시작하지 않거나 없는 날짜의 id를 거절한다", () => {
    assert.notDeepEqual(errorsOf(topic({ id: "chat-2026-11-18" })), []);
    assert.notDeepEqual(errorsOf(topic({ id: "2026-02-30-chat", date: "2026-02-30" })), []);
  });

  test("캡처 이름에 경로를 넣을 수 없다", () => {
    const escaped = topic({ references: [reference("r1", ["../secret.png"])] });
    assert.match(errorsOf(escaped).join(), /captures\[0\]/);
  });

  test("하나로 결정하면 항목이 하나이고 부분은 비워 둘 수 있다", () => {
    const single = { mode: "single", items: [{ ref: "r2", part: "" }], decidedOn: "2026-11-18" };
    assert.deepEqual(errorsOf(topic({ status: "building", selection: single })), []);
    const two = { ...single, items: [{ ref: "r1", part: "" }, { ref: "r2", part: "" }] };
    assert.notDeepEqual(errorsOf(topic({ status: "building", selection: two })), []);
  });

  test("조합하면 레퍼런스마다 가져올 부분이 있어야 한다", () => {
    const combine = (part: string) => ({
      mode: "combine",
      items: [{ ref: "r1", part: "사이드바" }, { ref: "r2", part }],
      decidedOn: "2026-11-18",
    });
    assert.deepEqual(errorsOf(topic({ status: "building", selection: combine("메시지 밀도") })), []);
    assert.match(errorsOf(topic({ status: "building", selection: combine(" ") })).join(), /가져올 부분/);
  });

  test("선택과 상태가 어긋나면 거절한다", () => {
    const single = { mode: "single", items: [{ ref: "r1", part: "" }], decidedOn: "2026-11-18" };
    assert.notDeepEqual(errorsOf(topic({ status: "building", selection: null })), []);
    assert.notDeepEqual(errorsOf(topic({ status: "selecting", selection: single })), []);
    const unknown = { ...single, items: [{ ref: "r9", part: "" }] };
    assert.match(errorsOf(topic({ status: "building", selection: unknown })).join(), /r9/);
  });

  test("잘못된 주제가 있어도 나머지 주제는 최신 날짜부터 목록에 남는다", () => {
    const entries = collectTopics([
      { folder: "2026-11-17-feed", data: topic({ id: "2026-11-17-feed", date: "2026-11-17" }) },
      { folder: "2026-11-19-broken", data: { id: 3 } },
      { folder: "2026-11-18-chat", data: topic() },
    ]);
    assert.deepEqual(
      entries.map((entry) => [entry.folder, entry.result.ok]),
      [
        ["2026-11-19-broken", false],
        ["2026-11-18-chat", true],
        ["2026-11-17-feed", true],
      ],
    );
  });

  test("정체성은 없어도 받고, 있으면 모든 칸을 검사한다", () => {
    const identity = {
      fonts: { body: "IBM Plex Sans KR", title: "IBM Plex Sans KR" },
      colors: { ground: "#f4efe6", accent: "#b4441f" },
      radius: "2px",
      motion: "짧고 단단하게 멈추는 160ms 곡선, 흐림 없음",
      title: "굵기 700, 숫자는 고정폭",
      basis: "영수증과 장부의 종이 느낌. 직전 완성작의 푸른 회색과 6px에서 벗어남",
    };
    assert.deepEqual(errorsOf(topic()), [], "정체성 칸이 생기기 전 주제");
    assert.deepEqual(errorsOf(topic({ identity })), []);
    assert.deepEqual(errorsOf(topic({ identity: { ...identity, radius: "0" } })), []);
    assert.match(errorsOf(topic({ identity: { ...identity, radius: "0~6px" } })).join(), /identity\.radius/, "범위가 아니라 한 값");
    assert.match(errorsOf(topic({ identity: { ...identity, radius: "1rem" } })).join(), /identity\.radius/);
    assert.match(errorsOf(topic({ identity: { ...identity, colors: { ground: "#fff", accent: "#b4441f" } } })).join(), /colors\.ground/);
    assert.match(errorsOf(topic({ identity: { ...identity, fonts: { body: "" , title: "A" } } })).join(), /fonts\.body/);
    assert.match(errorsOf(topic({ identity: { ...identity, basis: " " } })).join(), /identity\.basis/);
    assert.match(errorsOf(topic({ identity: "Pretendard" })).join(), /identity는 객체/);
    const { motion: _motion, ...missing } = identity;
    assert.match(errorsOf(topic({ identity: missing })).join(), /identity\.motion/);
  });

  test("대상은 없어도 받고, 있으면 저장소와 화면이 모두 있어야 한다", () => {
    const target = { repo: "~/dev/p/screen-note", screen: "보관함 목록" };
    assert.deepEqual(errorsOf(topic({ target })), []);
    assert.match(errorsOf(topic({ target: { ...target, repo: " " } })).join(), /target\.repo/);
    assert.match(errorsOf(topic({ target: { repo: target.repo } })).join(), /target\.screen/);
    assert.match(errorsOf(topic({ target: { ...target, screen: 3 } })).join(), /target\.screen/);
    assert.match(errorsOf(topic({ target: "screen-note" })).join(), /target은 객체/);
  });

  test("수집으로 끝난 주제는 선택 없이 받고, 레퍼런스마다 동작과 근거가 있어야 한다", () => {
    const seen = { ...reference("r1", ["r1-1.png"]), behavior: ["qtyremove.zero"], evidence: "still" };
    const read = { ...reference("r2"), behavior: ["clearall.place"], evidence: "read" };
    const collected = (references: unknown[]) => topic({ status: "collected", references });
    assert.deepEqual(errorsOf(collected([seen, read])), []);

    const single = { mode: "single", items: [{ ref: "r1", part: "" }], decidedOn: "2026-11-18" };
    assert.match(errorsOf({ ...collected([seen, read]), selection: single }).join(), /collected 상태에서는 selection이 null/);
    assert.match(errorsOf(collected([seen, reference("r2")])).join(), /references\[1\]\.evidence/);
    assert.match(errorsOf(collected([seen, { ...read, behavior: [] }])).join(), /references\[1\]\.behavior/);
  });

  test("화면을 봤다는 근거는 캡처가 있어야 하고, 정해진 근거 값만 받는다", () => {
    const withEvidence = (evidence: unknown, captures: string[] = []) => ({ ...reference("r1", captures), evidence });
    assert.deepEqual(errorsOf(topic({ references: [withEvidence("secondhand")] })), []);
    assert.deepEqual(errorsOf(topic({ references: [withEvidence("state", ["r1-1.png"])] })), []);
    for (const evidence of ["state", "still"]) {
      assert.match(errorsOf(topic({ references: [withEvidence(evidence)] })).join(), /캡처가 하나 이상/);
    }
    assert.match(errorsOf(topic({ references: [withEvidence("seen")] })).join(), /evidence는/);
    assert.match(errorsOf(topic({ references: [{ ...reference("r1"), behavior: [" "] }] })).join(), /behavior\[0\]/);
  });
});

describe("검사 명령", () => {
  const root = mkdtempSync(join(tmpdir(), "today-ref-check-"));
  after(() => rmSync(root, { recursive: true, force: true }));

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  const writeTopic = (folder: string, content: string) => {
    mkdirSync(join(root, "topics", folder), { recursive: true });
    writeFileSync(join(root, "topics", folder, "topic.json"), content);
  };
  const writeCapture = (folder: string, name: string, bytes: Buffer) => {
    mkdirSync(join(root, "captures", folder), { recursive: true });
    writeFileSync(join(root, "captures", folder, name), bytes);
  };

  writeTopic(
    "2026-11-18-chat",
    JSON.stringify(
      topic({ references: [reference("r1", ["r1-1.png", "r1-2.png"]), reference("r2", ["r2-1.png", "r2-2.png"])] }),
    ),
  );
  writeCapture("2026-11-18-chat", "r1-1.png", png);
  writeCapture("2026-11-18-chat", "r2-1.png", Buffer.from("<html>not an image</html>"));
  writeCapture("2026-11-18-chat", "r2-2.png", Buffer.concat([png, Buffer.alloc(limits.captureBytes)]));
  writeTopic("2026-11-19-broken", "{ not json");
  writeTopic(
    "2026-11-20-feed",
    JSON.stringify(
      topic({
        id: "2026-11-20-feed",
        date: "2026-11-20",
        status: "building",
        selection: { mode: "single", items: [{ ref: "r1", part: "" }], decidedOn: "2026-11-20" },
      }),
    ),
  );

  const reports = checkWorkspace(root, defaultDeliveries, join(root, "captures"));
  const byFolder = (folder: string) => reports.find((report) => report.folder === folder);

  test("읽지 못한 주제는 그 주제만 실패한다", () => {
    assert.deepEqual(
      reports.map((report) => report.folder),
      ["2026-11-20-feed", "2026-11-19-broken", "2026-11-18-chat"],
    );
    assert.match(byFolder("2026-11-19-broken")?.errors.join() ?? "", /JSON/);
  });

  test("빠진 캡처는 경고, 이미지가 아니거나 너무 큰 캡처는 오류다", () => {
    const chat = byFolder("2026-11-18-chat");
    assert.deepEqual(chat?.warnings, ["r1 r1-2.png: 캡처 파일이 이 사본에 없습니다"]);
    assert.equal(chat?.errors.length, 2);
    assert.match(chat?.errors[0] ?? "", /r2-1.png: 이미지 파일이 아닙니다/);
    assert.match(chat?.errors[1] ?? "", /r2-2.png: 5MB/);
  });

  test("선택을 확정한 주제는 완성작 폴더가 있어야 한다", () => {
    assert.match(byFolder("2026-11-20-feed")?.errors.join() ?? "", /works\/2026-11-20-feed/);
  });

  test("주제 하나만 검사하면 다른 주제가 깨져 있어도 그 주제의 결과만 낸다", () => {
    const scoped = checkWorkspace(root, defaultDeliveries, join(root, "captures"), "2026-11-18-chat");
    assert.deepEqual(scoped.map((report) => report.folder), ["2026-11-18-chat"]);
    assert.deepEqual(scoped[0], byFolder("2026-11-18-chat"));
  });

  test("없는 주제나 주제 id가 아닌 값을 주면 통과시키지 않는다", () => {
    const missing = checkWorkspace(root, defaultDeliveries, join(root, "captures"), "2026-11-30-none");
    assert.match(missing[0]?.errors.join() ?? "", /topic\.json이 없습니다/);
    const outside = checkWorkspace(root, defaultDeliveries, join(root, "captures"), "../2026-11-18-chat");
    assert.match(outside[0]?.errors.join() ?? "", /주제 id여야/);
  });

  test("수집으로 끝난 주제는 완성작 폴더가 없어도 통과한다", () => {
    const fixture = mkdtempSync(join(root, "collected-"));
    const folder = "2026-11-21-delete";
    mkdirSync(join(fixture, "topics", folder), { recursive: true });
    writeFileSync(join(fixture, "topics", folder, "topic.json"), JSON.stringify(
      topic({
        id: folder,
        date: "2026-11-21",
        status: "collected",
        references: [{ ...reference("r1"), behavior: ["qtyremove.zero"], evidence: "read" }],
      }),
    ));
    assert.deepEqual(checkWorkspace(fixture), [{ folder, errors: [], warnings: [] }]);
  });

  test("주제나 캡처 경로가 디렉터리여도 다른 주제의 검사 결과가 남는다", () => {
    const fixture = mkdtempSync(join(root, "read-errors-"));
    const valid = "2026-11-18-valid";
    const badCapture = "2026-11-18-bad-capture";
    const badTopic = "2026-11-18-bad-topic";
    for (const folder of [valid, badCapture]) {
      const captures = folder === badCapture ? ["r1-1.png", "r1-2.png"] : [];
      mkdirSync(join(fixture, "topics", folder), { recursive: true });
      writeFileSync(join(fixture, "topics", folder, "topic.json"), JSON.stringify(
        topic({ id: folder, references: [reference("r1", captures)] }),
      ));
    }
    mkdirSync(join(fixture, "topics", badTopic, "topic.json"), { recursive: true });
    mkdirSync(join(fixture, "captures", badCapture, "r1-1.png"), { recursive: true });

    const result = checkWorkspace(fixture, defaultDeliveries, join(fixture, "captures"));
    assert.deepEqual(result.find((item) => item.folder === valid), { folder: valid, errors: [], warnings: [] });
    assert.match(result.find((item) => item.folder === badTopic)?.errors.join() ?? "", /topic\.json/);
    const captureReport = result.find((item) => item.folder === badCapture);
    assert.match(captureReport?.errors.join() ?? "", /r1-1\.png/);
    assert.match(captureReport?.warnings.join() ?? "", /r1-2\.png/);
  });
});

describe("tastepin 다듬기 전달 기록", () => {
  const root = mkdtempSync(join(tmpdir(), "today-ref-taste-"));
  after(() => rmSync(root, { recursive: true, force: true }));
  const selection = { mode: "single", items: [{ ref: "r1", part: "" }], decidedOn: "2026-11-18" };
  for (const id of ["2026-11-18-shop", "2026-11-19-blog", "2026-11-20-map", "2026-11-21-feed"]) {
    const status = id === "2026-11-21-feed" ? "building" : "done";
    mkdirSync(join(root, "topics", id), { recursive: true });
    writeFileSync(join(root, "topics", id, "topic.json"), JSON.stringify(topic({ id, date: id.slice(0, 10), status, selection })));
    mkdirSync(join(root, "works", id), { recursive: true });
    writeFileSync(join(root, "works", id, "package.json"), "{}");
  }
  const deliveries = join(root, "deliveries.jsonl");
  writeFileSync(deliveries, [
    JSON.stringify({ project: "~/dev/p/for-me/apps/today-ref/works/2026-11-18-shop" }),
    JSON.stringify({ project: "C:\\Users\\me\\dev\\p\\for-me\\apps\\today-ref\\works\\2026-11-19-blog" }),
    JSON.stringify({ project: "~/dev/p/for-me/apps/today-ref" }),
    "{ broken",
    "",
  ].join("\n"));
  const warningsOf = (reports: ReturnType<typeof checkWorkspace>, folder: string) =>
    reports.find((report) => report.folder === folder)?.warnings ?? [];

  test("완성작 폴더에서 실행한 기록이 없는 완성작만 경고한다", () => {
    const reports = checkWorkspace(root, deliveries);
    assert.deepEqual(warningsOf(reports, "2026-11-18-shop"), []);
    assert.deepEqual(warningsOf(reports, "2026-11-19-blog"), [], "Windows 경로의 기록도 센다");
    assert.match(warningsOf(reports, "2026-11-20-map").join(), /tastepin 다듬기 전달 기록이 없습니다/,
      "today-ref 폴더에서 실행한 기록은 어느 완성작인지 몰라 세지 않는다");
    assert.deepEqual(warningsOf(reports, "2026-11-21-feed"), [], "아직 만드는 중인 완성작은 경고하지 않는다");
    assert.ok(reports.every((report) => report.errors.length === 0), "전달 기록이 없어도 실패가 아니라 경고다");
  });

  test("원장이 없는 사본에서는 검사를 건너뛴다", () => {
    const reports = checkWorkspace(root, join(root, "missing.jsonl"));
    assert.ok(reports.every((report) => report.warnings.length === 0));
  });
});

describe("캡처 폴더 위치", () => {
  const root = resolve("/home/me/dev/p/for-me/apps/today-ref");
  const shared = resolve("/home/me/dev/p/today-ref-captures");

  test("for-me 옆에 비공개 캡처 저장소가 있으면 그 폴더를 쓴다", () => {
    assert.equal(capturesDir(root, {}, (path) => path === shared), shared);
  });

  test("캡처 저장소가 없는 사본은 today-ref 안의 captures/를 쓴다", () => {
    assert.equal(capturesDir(root, {}, () => false), join(root, "captures"));
  });

  test("TODAY_REF_CAPTURES가 있으면 저장소 유무와 관계없이 그 경로를 쓴다", () => {
    const configured = resolve("/data/captures");
    assert.equal(capturesDir(root, { TODAY_REF_CAPTURES: configured }, () => true), configured);
  });

  test("검사는 받은 캡처 폴더에서 파일을 찾는다", () => {
    const fixture = mkdtempSync(join(tmpdir(), "today-ref-captures-"));
    after(() => rmSync(fixture, { recursive: true, force: true }));
    const folder = "2026-11-27-shop";
    mkdirSync(join(fixture, "topics", folder), { recursive: true });
    writeFileSync(join(fixture, "topics", folder, "topic.json"), JSON.stringify(
      topic({
        id: folder,
        date: "2026-11-27",
        status: "collected",
        references: [{ ...reference("r1", ["r1-1.png"]), behavior: ["shop.layout"], evidence: "still" }],
      }),
    ));
    const elsewhere = join(fixture, "shared-captures");
    mkdirSync(join(elsewhere, folder), { recursive: true });
    writeFileSync(join(elsewhere, folder, "r1-1.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    assert.deepEqual(checkWorkspace(fixture, null, elsewhere), [{ folder, errors: [], warnings: [] }]);
    assert.match(checkWorkspace(fixture, null, join(fixture, "captures"))[0].warnings.join(), /r1-1\.png/);
  });
});
