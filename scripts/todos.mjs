#!/usr/bin/env node
// 저장소 문서의 할 일과 이 머신 기록 도구의 열린 요청을 대조한다.
// 읽기만 한다. 할 일의 상태는 Git으로 나뉘는 문서가 소유하고, 기록 도구(apps/journal/data, Git 제외)는 머신마다 따로라서
// 한 머신에서 끝낸 일이 다른 머신 기록에는 열린 채 남는다. 규칙은 docs/development.md의 "할 일"이 소유한다.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skippedDirs = new Set(["node_modules", "dist", "target", "build", ".gradle", ".kotlin", ".git", "data", "legacy"]);

// 기록 도구의 할 일 요청 제목은 "할 일: <제목>"이고, 문서에는 "<제목>"만 쓴다.
const journalTodoPrefix = "할 일: ";

// "- [ ] **제목.** 설명" 또는 "- [ ] 제목. 설명"에서 제목을 뽑는다.
export function parseTodoLine(line) {
  const match = line.match(/^\s*- \[( |x)\] (.*)$/);
  if (!match) return null;
  const done = match[1] === "x";
  const text = match[2];
  const bold = text.match(/^\*\*(.+?)\*\*/);
  const raw = bold ? bold[1] : text.split(/(?<=[.?!])\s/)[0];
  return { done, title: raw.trim().replace(/[.。]$/, "") };
}

export function collectDocTodos(root) {
  const todos = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skippedDirs.has(entry.name) && !entry.name.startsWith(".")) visit(join(dir, entry.name));
      } else if (entry.name.endsWith(".md")) {
        const path = join(dir, entry.name);
        readFileSync(path, "utf8").split(/\r?\n/).forEach((line, index) => {
          const todo = parseTodoLine(line);
          if (todo) todos.push({ ...todo, file: relative(root, path).replaceAll("\\", "/"), line: index + 1 });
        });
      }
    }
  };
  visit(root);
  return todos;
}

// 문서에 있어야 하는 기록: 시작하지 않은 요청(open)과 "결정 대기:"로 시작하는 요청.
export function journalTodos(journal) {
  return journal.records
    .filter((r) => !r.deleted && r.kind === "request")
    .filter((r) => r.stage === "open" || r.title.startsWith("결정 대기:"))
    .map((r) => ({ id: r.id, appId: r.appId, stage: r.stage, title: r.title.startsWith(journalTodoPrefix) ? r.title.slice(journalTodoPrefix.length) : r.title }));
}

// 끝난 요청은 문서에 열린 할 일로 남아 있으면 안 된다.
function doneJournalTitles(journal) {
  return new Set(
    journal.records
      .filter((r) => !r.deleted && r.kind === "request" && r.stage === "done")
      .map((r) => (r.title.startsWith(journalTodoPrefix) ? r.title.slice(journalTodoPrefix.length) : r.title)),
  );
}

export function compare(docTodos, journal) {
  const problems = [];
  const docsByTitle = new Map(docTodos.map((todo) => [todo.title, todo]));
  for (const record of journalTodos(journal)) {
    const doc = docsByTitle.get(record.title);
    if (!doc) problems.push({ kind: "doc-missing", record });
    else if (doc.done) problems.push({ kind: "journal-behind", record, doc });
  }
  const done = doneJournalTitles(journal);
  for (const doc of docTodos) {
    if (!doc.done && done.has(doc.title)) problems.push({ kind: "doc-behind", doc });
  }
  return problems;
}

function readJournal(root) {
  const cli = join(root, "apps", "journal", "src", "cli.mjs");
  if (!existsSync(join(root, "apps", "journal", "data", "journal.json"))) return null;
  return JSON.parse(execFileSync(process.execPath, [cli, "read"], { cwd: root, encoding: "utf8" }));
}

const problemText = {
  "doc-missing": (p) => `이 머신 기록의 ${p.record.stage} 요청이 문서에 없음: [${p.record.appId}] ${p.record.title} (기록 ${p.record.id.slice(0, 8)})`,
  "journal-behind": (p) => `문서는 완료, 이 머신 기록은 ${p.record.stage}: ${p.record.title} (${p.doc.file}:${p.doc.line}, 기록 ${p.record.id.slice(0, 8)})`,
  "doc-behind": (p) => `이 머신 기록은 완료, 문서는 열림: ${p.doc.title} (${p.doc.file}:${p.doc.line})`,
};

function main(args) {
  const unknown = args.filter((arg) => arg !== "--all");
  if (unknown.length > 0) {
    console.error(`알 수 없는 인자: ${unknown.join(" ")}\n사용법: node scripts/todos.mjs [--all]`);
    return 2;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const docTodos = collectDocTodos(root);
  const shown = args.includes("--all") ? docTodos : docTodos.filter((todo) => !todo.done);
  const lines = [`문서의 할 일 ${docTodos.filter((t) => !t.done).length}개 열림, ${docTodos.filter((t) => t.done).length}개 완료`];
  for (const todo of shown) lines.push(`  [${todo.done ? "완료" : "열림"}] ${todo.title} (${todo.file}:${todo.line})`);
  const journal = readJournal(root);
  if (!journal) {
    lines.push("", "이 머신에 기록 도구 데이터가 없어 대조하지 않았습니다.");
    console.log(lines.join("\n"));
    return 0;
  }
  const problems = compare(docTodos, journal);
  lines.push("", problems.length === 0 ? `기록 대조: 어긋남 없음 (revision ${journal.revision})` : `기록 대조: 어긋남 ${problems.length}개`);
  for (const problem of problems) lines.push(`  ${problemText[problem.kind](problem)}`);
  console.log(lines.join("\n"));
  return problems.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
