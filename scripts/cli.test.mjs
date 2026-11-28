import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { Store } from "../apps/journal/src/store.mjs";

function temporaryRoot(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "for-me-cli-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("링크로 접근한 두 스크립트도 인자를 검사한다", (t) => {
  const link = join(temporaryRoot(t), "scripts");
  symlinkSync(import.meta.dirname, link, "junction");
  for (const script of ["build-status.mjs", "todos.mjs"]) {
    const result = spawnSync(process.execPath, [join(link, script), "--invalid"], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /알 수 없는 인자/);
  }
});

test("1 MiB를 넘는 기록도 끝까지 읽고 문서와 대조한다", async (t) => {
  const root = temporaryRoot(t);
  const scripts = join(root, "scripts");
  mkdirSync(scripts);
  copyFileSync(join(import.meta.dirname, "todos.mjs"), join(scripts, "todos.mjs"));
  const journal = join(root, "apps", "journal");
  cpSync(new URL("../apps/journal/src/", import.meta.url), join(journal, "src"), {
    recursive: true,
    filter: (path) => basename(path) === "src" || path.endsWith(".mjs"),
  });
  const store = new Store(join(journal, "data"));
  await store.initialize();
  for (let i = 0; i < 12; i++) {
    await store.execute({
      operationId: `large-record-${i}`,
      expectedRevision: i,
      actor: "user",
      command: "record.create",
      data: { appId: "video", kind: "use", title: "시험", body: "가".repeat(18000), authority: "user" },
    });
  }
  const read = spawnSync(process.execPath, [join(journal, "src", "cli.mjs"), "read"], { maxBuffer: 4 * 1024 * 1024 });
  assert.equal(read.status, 0);
  assert.ok(read.stdout.length > 1024 * 1024);
  const result = spawnSync(process.execPath, [join(scripts, "todos.mjs")], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /어긋남 없음 \(revision 12\)/);
});
