// /today-ref-use의 첫 단어 호출을 이 머신의 기록 도구에 세고, 쓴 단어와 안 쓴 단어를 보여 준다.
// 사용: node scripts/calls.ts add [첫 단어] | node scripts/calls.ts report [--since YYYY-MM-DD]
// 기록 도구(apps/journal)는 머신마다 따로라, 머신끼리 비교할 때는 머신마다 report를 돌려 모은다.
// 첫 단어 목록은 docs/invoke.md의 호출 표가 소유한다. 대상(첫 단어 뒤)은 회사 제품 이름일 수 있어 남기지 않는다.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const journalCli = resolve(root, "..", "journal", "src", "cli.mjs");
// 기록 도구를 기본 위치가 아닌 곳(--data-dir)에 두었다면 TODAY_REF_JOURNAL_DIR로 같은 폴더를 준다.
const journalDirArgs = process.env.TODAY_REF_JOURNAL_DIR ? ["--data-dir", resolve(process.env.TODAY_REF_JOURNAL_DIR)] : [];

export const outsideTable = "(표 밖)";
export const noWord = "(없음)";
export const callPrefix = "호출: ";

export interface JournalRecord {
  appId: string;
  kind: string;
  details: string;
  occurredOn: string;
  deleted?: boolean;
}

// 호출 표의 첫 열(`제작` 같은 단어)을 순서대로 읽는다.
export function parseCallWords(invokeMarkdown: string): string[] {
  const words: string[] = [];
  for (const line of invokeMarkdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (match) words.push(match[1]);
  }
  return words;
}

export function classify(word: string | undefined, words: string[]): string {
  if (!word) return noWord;
  return words.includes(word) ? word : outsideTable;
}

// 사용자 시간대(KST)의 날짜. 기록 도구가 날짜를 비우면 UTC 날짜를 넣어 직접 정한다.
export function kstDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface CallSummary {
  rows: { word: string; count: number; lastOn: string | null }[];
  total: number;
  firstOn: string | null;
}

export function summarize(records: JournalRecord[], words: string[], since: string | null): CallSummary {
  const calls = records.filter(
    (r) => !r.deleted && r.appId === "today-ref" && r.kind === "use" && r.details.startsWith(callPrefix) && (!since || r.occurredOn >= since),
  );
  const rows = [...words, outsideTable, noWord].map((word) => {
    const mine = calls.filter((r) => r.details.slice(callPrefix.length) === word);
    const lastOn = mine.map((r) => r.occurredOn).sort().at(-1) ?? null;
    return { word, count: mine.length, lastOn };
  });
  const firstOn = calls.map((r) => r.occurredOn).sort()[0] ?? null;
  return { rows, total: calls.length, firstOn };
}

function readJournal(): { revision: number; records: JournalRecord[] } {
  return JSON.parse(execFileSync(process.execPath, [journalCli, "read", ...journalDirArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}

function add(word: string | undefined, words: string[]): void {
  const label = classify(word, words);
  const now = new Date();
  const { revision } = readJournal();
  const payload = {
    operationId: `today-ref-call-${randomUUID()}`,
    expectedRevision: revision,
    actor: "ai",
    command: "record.create",
    data: {
      appId: "today-ref",
      kind: "use",
      title: `/today-ref-use ${label} 호출`,
      body: "호출 표의 첫 단어를 세는 기록입니다. 대상은 남기지 않습니다.",
      details: `${callPrefix}${label}`,
      authority: "verified",
      stage: "done",
      count: 1,
      measurement: "measured",
      occurredOn: kstDate(now),
    },
  };
  execFileSync(process.execPath, [journalCli, "write", ...journalDirArgs], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  console.log(`셌습니다: ${label}`);
}

function report(since: string | null, words: string[]): void {
  const summary = summarize(readJournal().records, words, since);
  const range = since ? `${since}부터` : summary.firstOn ? `${summary.firstOn}부터` : "기록 없음";
  const lines = [`이 머신의 /today-ref-use 호출 ${summary.total}회 (${range})`];
  for (const row of summary.rows) lines.push(`  ${row.word}\t${row.count}회${row.lastOn ? `\t마지막 ${row.lastOn}` : ""}`);
  const unused = summary.rows.filter((row) => row.count === 0 && words.includes(row.word)).map((row) => row.word);
  lines.push(`안 쓴 단어: ${unused.length > 0 ? unused.join(", ") : "없음"}`);
  console.log(lines.join("\n"));
}

function main(args: string[]): number {
  const words = parseCallWords(readFileSync(join(root, "docs", "invoke.md"), "utf8"));
  const [command, ...rest] = args;
  if (command === "add" && rest.length <= 1) {
    add(rest[0], words);
    return 0;
  }
  if (command === "report") {
    if (rest.length === 0) return (report(null, words), 0);
    if (rest.length === 2 && rest[0] === "--since" && /^\d{4}-\d{2}-\d{2}$/.test(rest[1])) return (report(rest[1], words), 0);
  }
  console.error("사용: node scripts/calls.ts add [첫 단어] | node scripts/calls.ts report [--since YYYY-MM-DD]");
  return 2;
}

// 기록 도구가 거절하거나 없으면 그 응답을 한 줄로 알린다. 부른 쪽(호출 표)은 실패를 보고하고 일을 계속한다.
function journalError(error: unknown): string {
  const stderr = (error as { stderr?: string }).stderr?.trim();
  return stderr || (error instanceof Error ? error.message : String(error));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`기록 도구 오류: ${journalError(error)}`);
    process.exitCode = 1;
  }
}
