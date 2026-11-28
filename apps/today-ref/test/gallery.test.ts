import assert from "node:assert/strict";
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, test } from "node:test";

import { decide, galleryApp, identityPath, probe, type Probe } from "../scripts/gallery.ts";

const topicsDir = "C:\\Users\\me\\dev\\p\\for-me\\apps\\today-ref\\topics";

async function listen(handler: RequestListener): Promise<{ server: Server; port: number }> {
  const server = createServer(handler);
  await new Promise<void>((done) => server.listen(0, "localhost", done));
  return { server, port: (server.address() as AddressInfo).port };
}

async function probeWith(handler: RequestListener): Promise<Probe> {
  const { server, port } = await listen(handler);
  try {
    return await probe(port);
  } finally {
    server.close();
  }
}

describe("갤러리 재사용", () => {
  test("아무도 듣지 않는 포트면 새로 띄운다", async () => {
    const { server, port } = await listen(() => {});
    await new Promise((done) => server.close(done));
    const result = await probe(port);
    assert.deepEqual(result, { kind: "none" });
    assert.deepEqual(decide(result, topicsDir, port), { kind: "start" });
  });

  test("같은 사본의 갤러리면 새로 띄우지 않고 그 주소를 쓴다", async () => {
    const result = await probeWith((request, response) => {
      assert.equal(request.url, identityPath);
      response.end(JSON.stringify({ app: galleryApp, topicsDir }));
    });
    assert.deepEqual(decide(result, topicsDir, 4319), { kind: "reuse", url: "http://localhost:4319" });
  });

  test("Windows에서는 드라이브 문자 대소문자만 다른 경로를 같은 사본으로 본다", () => {
    const result: Probe = { kind: "gallery", identity: { app: galleryApp, topicsDir: topicsDir.replace("C:", "c:") } };
    assert.equal(decide(result, topicsDir, 4319, "win32").kind, "reuse");
  });

  test("다른 사본의 갤러리면 이 사본의 주제가 안 나온다고 알리고 멈춘다", async () => {
    const other = "C:\\Users\\me\\worktrees\\for-me\\apps\\today-ref\\topics";
    const result = await probeWith((_request, response) => {
      response.end(JSON.stringify({ app: galleryApp, topicsDir: other }));
    });
    const decision = decide(result, topicsDir, 4319);
    assert.equal(decision.kind, "stop");
    assert.match(decision.kind === "stop" ? decision.message : "", /다른 사본/);
  });

  test("갤러리가 아닌 서버가 포트를 쓰면 멈춘다", async () => {
    const html = await probeWith((_request, response) => {
      response.setHeader("content-type", "text/html");
      response.end("<!doctype html><title>other</title>");
    });
    const notFound = await probeWith((_request, response) => {
      response.statusCode = 404;
      response.end();
    });
    for (const result of [html, notFound]) {
      assert.equal(result.kind, "other");
      assert.equal(decide(result, topicsDir, 4319).kind, "stop");
    }
  });
});
