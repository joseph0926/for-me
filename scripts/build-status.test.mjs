import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { checkPnpmInstall, checkProduct, products, parseAdbDevices, parseDumpsysVersion } from "./build-status.mjs";

let root;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "build-status-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

// 수정 시각을 정해서 파일을 만든다. 시각은 분 단위 오프셋이다.
function file(path, content, minute) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  const time = new Date(Date.UTC(2026, 10, 26, 0, minute));
  utimesSync(full, time, time);
}

function prepareApk(versionName = "0.6.1") {
  file("app/build.gradle.kts", 'val appVersion = "0.6.1"', 0);
  file("app/out/output-metadata.json", JSON.stringify({ elements: [{ versionName, outputFile: "app.apk" }] }), 10);
  file("app/out/app.apk", "apk", 10);
}

const noDevices = { exeVersion: () => null, androidDevices: () => [], androidVersion: () => null };

const videoLike = {
  id: "app",
  name: "앱",
  dir: "app",
  version: { file: "build.gradle.kts", pattern: /val appVersion = "([^"]+)"/ },
  sources: ["src", "build.gradle.kts"],
  builds: [{ label: "APK", kind: "apk", path: "out" }],
  installs: [{ kind: "android", packageId: "dev.example" }],
};

test("소스 버전과 다른 APK는 오래됨으로 판정한다", () => {
  prepareApk("0.6.0");
  const [apk] = checkProduct(root, videoLike, noDevices, "win32").checks;
  assert.equal(apk.state, "old");
  assert.match(apk.detail, /0\.6\.0, 소스는 0\.6\.1/);
});

test("버전이 같아도 빌드 뒤에 바뀐 소스가 있으면 그 파일을 알린다", () => {
  prepareApk();
  file("app/src/Player.kt", "class Player", 20);
  const [apk] = checkProduct(root, videoLike, noDevices, "win32").checks;
  assert.equal(apk.state, "old");
  assert.match(apk.detail, /src\/Player\.kt/);
});

test("빌드 뒤 소스 변경이 없으면 최신이고, 기기가 없으면 설치본은 미확인이다", () => {
  prepareApk();
  file("app/src/Player.kt", "class Player", 5);
  const [apk, device] = checkProduct(root, videoLike, noDevices, "win32").checks;
  assert.equal(apk.state, "ok");
  assert.equal(device.state, "unchecked");
});

test("기기마다 설치된 버전을 소스와 대조한다", () => {
  file("app/build.gradle.kts", 'val appVersion = "0.6.1"', 0);
  const probes = {
    ...noDevices,
    androidDevices: () => ["emulator-5554", "R3CX"],
    androidVersion: (serial) => (serial === "R3CX" ? "0.6.1" : "0.5.0"),
  };
  const [, emulator, phone] = checkProduct(root, videoLike, probes, "win32").checks;
  assert.equal(emulator.state, "old");
  assert.equal(phone.state, "ok");
});

test("다른 운영체제 전용 제품은 점검하지 않고 이유를 남긴다", () => {
  const result = checkProduct(root, { ...videoLike, os: "darwin" }, noDevices, "win32");
  assert.equal(result.checks.length, 0);
  assert.match(result.note, /macOS 전용/);
});

test("pnpm 설치 뒤 lockfile이 바뀌었거나 설치하지 않았으면 알린다", () => {
  file("web/pnpm-lock.yaml", "lock", 0);
  assert.equal(checkPnpmInstall(join(root, "web"), ".").state, "missing");
  file("web/node_modules/.pnpm/lock.yaml", "lock", 10);
  assert.equal(checkPnpmInstall(join(root, "web"), ".").state, "ok");
  file("web/pnpm-lock.yaml", "lock 2", 20);
  assert.equal(checkPnpmInstall(join(root, "web"), ".").state, "old");
});

test("adb 기기 목록에서 연결된 기기만 고른다", () => {
  const output = "List of devices attached\nemulator-5554\tdevice\nR3CX\tunauthorized\n\n";
  assert.deepEqual(parseAdbDevices(output), ["emulator-5554"]);
});

test("dumpsys 출력에서 versionName을 읽고, 설치되지 않았으면 null이다", () => {
  assert.equal(parseDumpsysVersion("    versionCode=601 minSdk=26\n    versionName=0.6.1\n"), "0.6.1");
  assert.equal(parseDumpsysVersion("Unable to find package: dev.forme.video\n"), null);
});

test("기기 하나의 설치 버전 조회가 실패해도 다음 기기를 대조한다", () => {
  prepareApk();
  const probes = {
    androidDevices: () => ["disconnected", "connected"],
    androidVersion(serial) {
      if (serial === "disconnected") throw new Error("offline");
      return "0.6.1";
    },
  };
  const { checks } = checkProduct(root, videoLike, probes);
  assert.deepEqual(checks.map((c) => c.state), ["ok", "unchecked", "ok"]);
  assert.match(checks[1].detail, /조회 실패/);
});

test("기기 목록 조회 실패와 기기가 없는 경우를 구분한다", () => {
  prepareApk();
  const probes = { androidDevices() { throw new Error("adb failure"); } };
  const { checks } = checkProduct(root, videoLike, probes);
  assert.deepEqual(checks.map((c) => c.state), ["ok", "unchecked"]);
  assert.match(checks[1].detail, /목록 조회 실패/);
});

test("소스 버전 선언을 읽지 못하면 APK와 설치 버전 대조는 미확인이다", () => {
  prepareApk();
  file("app/build.gradle.kts", "// 버전 선언 누락", 0);
  const probes = { androidDevices: () => ["connected"], androidVersion: () => "0.6.1" };
  const [apk, device] = checkProduct(root, videoLike, probes).checks;
  assert.equal(apk.state, "unchecked");
  assert.equal(device.state, "unchecked");
  assert.match(device.detail, /소스 버전/);
});

test("갤러리 캡처와 완성작 사진 변경 및 빈 템플릿 빌드를 구분한다", (t) => {
  const product = products.find((p) => p.id === "today-ref");
  file("apps/today-ref/gallery/dist/index.html", "gallery", 10);
  file("apps/today-ref/works/demo/dist/index.html", "demo", 10);
  file("apps/today-ref/works/demo/public/photo.jpg", "photo", 20);
  file("captures/topic/image.png", "capture", 20);
  mkdirSync(join(root, "apps/today-ref/template/dist"), { recursive: true });
  const previous = process.env.TODAY_REF_CAPTURES;
  process.env.TODAY_REF_CAPTURES = join(root, "captures");
  t.after(() => {
    if (previous === undefined) delete process.env.TODAY_REF_CAPTURES;
    else process.env.TODAY_REF_CAPTURES = previous;
  });
  const [gallery, template, work] = checkProduct(root, product, noDevices).checks;
  assert.equal(gallery.state, "old");
  assert.match(gallery.detail, /topic\/image\.png/);
  assert.equal(template.state, "missing");
  assert.equal(work.state, "old");
  assert.match(work.detail, /public\/photo\.jpg/);
});
