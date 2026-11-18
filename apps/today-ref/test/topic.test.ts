import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";

import { checkWorkspace } from "../scripts/check.ts";
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

  const reports = checkWorkspace(root);
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
});
