import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

import { classify, kstDate, noWord, outsideTable, parseCallWords, summarize, type JournalRecord } from "../scripts/calls.ts";

const root = join(import.meta.dirname, "..");

function call(word: string, occurredOn: string, extra: Partial<JournalRecord> = {}): JournalRecord {
  return { appId: "today-ref", kind: "use", details: `호출: ${word}`, occurredOn, ...extra };
}

describe("호출 세기", () => {
  test("호출 표의 첫 열 열 단어를 순서대로 읽는다", () => {
    const words = parseCallWords(readFileSync(join(root, "docs", "invoke.md"), "utf8"));
    assert.deepEqual(words, ["제작", "수집", "개선", "새로", "재설계", "검토", "시편", "다듬기", "피드백", "목록"]);
  });

  test("표에 없는 단어와 빈 첫 단어는 대상 글자를 남기지 않고 따로 묶는다", () => {
    const words = ["제작", "수집"];
    assert.equal(classify("수집", words), "수집");
    assert.equal(classify("회사제품", words), outsideTable);
    assert.equal(classify(undefined, words), noWord);
  });

  test("날짜는 사용자 시간대 기준이다", () => {
    assert.equal(kstDate(new Date("2026-11-27T15:30:00Z")), "2026-11-28");
    assert.equal(kstDate(new Date("2026-11-27T14:59:00Z")), "2026-11-27");
  });

  test("단어별 횟수를 세고 안 쓴 단어는 0회로 남긴다", () => {
    const records = [
      call("수집", "2026-11-28"),
      call("수집", "2026-11-30"),
      call("목록", "2026-11-29"),
      call(outsideTable, "2026-11-29"),
      call("제작", "2026-11-29", { deleted: true }),
      { appId: "today-ref", kind: "use", details: "수집", occurredOn: "2026-11-29" },
      call("제작", "2026-11-29", { appId: "video" }),
    ];
    const summary = summarize(records, ["제작", "수집", "목록"], null);
    assert.equal(summary.total, 4);
    assert.equal(summary.firstOn, "2026-11-28");
    assert.deepEqual(summary.rows, [
      { word: "제작", count: 0, lastOn: null },
      { word: "수집", count: 2, lastOn: "2026-11-30" },
      { word: "목록", count: 1, lastOn: "2026-11-29" },
      { word: outsideTable, count: 1, lastOn: "2026-11-29" },
      { word: noWord, count: 0, lastOn: null },
    ]);
  });

  test("시작 날짜 앞의 호출은 세지 않는다", () => {
    const summary = summarize([call("수집", "2026-11-28"), call("수집", "2026-11-30")], ["수집"], "2026-11-29");
    assert.equal(summary.total, 1);
  });
});
