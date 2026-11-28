import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { collectDocTodos, compare, parseTodoLine } from "./todos.mjs";

const root = mkdtempSync(join(tmpdir(), "todos-"));
after(() => rmSync(root, { recursive: true, force: true }));

function file(path, content) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function request(title, stage) {
  return { id: `${title}-id-0000`, appId: "today-ref", kind: "request", title, stage, deleted: false };
}

test("체크박스 줄에서 굵은 제목이나 첫 문장을 제목으로 읽는다", () => {
  assert.deepEqual(parseTodoLine("- [ ] **블로그 다시 진행.** 처음부터 합니다."), { done: false, title: "블로그 다시 진행" });
  assert.deepEqual(parseTodoLine("  - [x] 캡처 옮기기. 남은 것 없음"), { done: true, title: "캡처 옮기기" });
  assert.equal(parseTodoLine("- 일반 목록 줄"), null);
});

test("문서의 할 일을 모으고 생성물 폴더는 건너뛴다", () => {
  file("apps/a/docs/scope.md", "# 범위\n\n- [ ] **열린 일.** 설명\n- [x] **끝난 일.** 설명\n");
  file("apps/a/node_modules/pkg/README.md", "- [ ] **패키지의 할 일.**\n");
  const todos = collectDocTodos(root);
  assert.deepEqual(
    todos.map((t) => [t.title, t.done, t.file, t.line]),
    [
      ["열린 일", false, "apps/a/docs/scope.md", 3],
      ["끝난 일", true, "apps/a/docs/scope.md", 4],
    ],
  );
});

test("이 머신의 열린 요청이 문서에 없으면 알린다", () => {
  const problems = compare([], { records: [request("할 일: 블로그 다시 진행", "open")] });
  assert.deepEqual(problems.map((p) => [p.kind, p.record.title]), [["doc-missing", "블로그 다시 진행"]]);
});

test("문서에서 끝난 할 일이 이 머신 기록에 열려 있으면 기록이 뒤처졌다고 알린다", () => {
  const docs = [{ title: "블로그 다시 진행", done: true, file: "s.md", line: 1 }];
  const problems = compare(docs, { records: [request("할 일: 블로그 다시 진행", "open")] });
  assert.deepEqual(problems.map((p) => p.kind), ["journal-behind"]);
});

test("이 머신 기록에서 끝난 요청이 문서에 열려 있으면 문서가 뒤처졌다고 알린다", () => {
  const docs = [{ title: "보관함 탭 나누기", done: false, file: "s.md", line: 1 }];
  const problems = compare(docs, { records: [request("보관함 탭 나누기", "done")] });
  assert.deepEqual(problems.map((p) => p.kind), ["doc-behind"]);
});

test("결정 대기 요청은 문서에 있어야 하고, 진행 중인 요청과 지운 요청은 대조하지 않는다", () => {
  const records = [
    request("결정 대기: 서체 다시 고르기", "waiting"),
    request("수집 진행", "in_progress"),
    { ...request("할 일: 지운 일", "open"), deleted: true },
  ];
  const problems = compare([], { records });
  assert.deepEqual(problems.map((p) => p.record.title), ["결정 대기: 서체 다시 고르기"]);
});

test("결정이 끝난 결정 대기 요청과 문서의 완료 줄은 어긋남이 아니다", () => {
  const docs = [{ title: "결정 대기: 서체 다시 고르기", done: true, file: "s.md", line: 1 }];
  assert.deepEqual(compare(docs, { records: [request("결정 대기: 서체 다시 고르기", "done")] }), []);
});

test("같은 제목으로 열린 할 일과 열린 요청은 어긋남이 아니다", () => {
  const docs = [{ title: "블로그 다시 진행", done: false, file: "s.md", line: 1 }];
  assert.deepEqual(compare(docs, { records: [request("할 일: 블로그 다시 진행", "open")] }), []);
});
