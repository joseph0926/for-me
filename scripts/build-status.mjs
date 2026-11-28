#!/usr/bin/env node
// 제품마다 소스 버전을 빌드 산출물, 이 머신의 설치본, 의존성 설치 상태와 대조해 보여 준다.
// 읽기만 한다. 빌드, 설치, 삭제는 하지 않는다. 판정 기준과 한계는 docs/development.md의 "빌드와 설치본 점검"이 소유한다.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { capturesDir } from "../apps/today-ref/scripts/captures.ts";

// 빌드나 설치가 만드는 폴더는 소스의 수정 시각을 셀 때 뺀다.
const generatedDirs = new Set(["node_modules", "dist", "target", "build", ".gradle", ".kotlin", ".git"]);

// 대조 대상. 새 제품이나 산출물 경로가 생기면 여기에 더한다.
// builds의 kind: apk(output-metadata.json의 versionName), exe(실행 파일의 제품 버전), nsis(설치 파일 이름의 버전), dist(버전 없이 수정 시각만).
// os가 있는 항목은 그 운영체제에서만 점검한다.
export const products = [
  {
    id: "video",
    name: "장면",
    dir: "apps/video",
    version: { file: "android/build.gradle.kts", pattern: /val appVersion = "([^"]+)"/ },
    sources: ["android/src", "android/build.gradle.kts", "build.gradle.kts", "settings.gradle.kts", "gradle.properties", "gradle"],
    builds: [
      { label: "디버그 APK", kind: "apk", path: "android/build/outputs/apk/debug" },
      { label: "릴리스 APK", kind: "apk", path: "android/build/outputs/apk/release" },
    ],
    installs: [{ kind: "android", packageId: "dev.forme.video" }],
  },
  {
    id: "music",
    name: "음악 앱",
    dir: "apps/music",
    version: { file: "android/build.gradle.kts", pattern: /val appVersion = "([^"]+)"/ },
    sources: ["android/src", "android/build.gradle.kts", "build.gradle.kts", "settings.gradle.kts", "gradle.properties", "gradle"],
    builds: [
      { label: "디버그 APK", kind: "apk", path: "android/build/outputs/apk/debug" },
      { label: "릴리스 APK", kind: "apk", path: "android/build/outputs/apk/release" },
    ],
    installs: [{ kind: "android", packageId: "dev.forme.music" }],
  },
  {
    id: "gallery",
    name: "갤러리 앱",
    dir: "apps/gallery",
    version: { file: "android/build.gradle.kts", pattern: /val appVersion = "([^"]+)"/ },
    sources: ["android/src", "android/build.gradle.kts", "build.gradle.kts", "settings.gradle.kts", "gradle.properties", "gradle"],
    builds: [
      { label: "디버그 APK", kind: "apk", path: "android/build/outputs/apk/debug" },
      { label: "릴리스 APK", kind: "apk", path: "android/build/outputs/apk/release" },
    ],
    installs: [{ kind: "android", packageId: "dev.forme.gallery" }],
  },
  {
    id: "screen-gif",
    name: "screen-gif",
    dir: "apps/screen-gif",
    version: { file: "src-tauri/tauri.conf.json", jsonKey: "version" },
    sources: ["src", "src-tauri", "encoder", "Cargo.toml", "Cargo.lock", "index.html", "package.json", "pnpm-lock.yaml", "vite.config.ts"],
    builds: [{ label: "릴리스 실행 파일", kind: "exe", path: "target/release/screen-gif.exe", os: "win32" }],
    installs: [
      {
        kind: "exe",
        label: "Windows 설치본",
        path: "%LOCALAPPDATA%/Programs/screen-gif/screen-gif.exe",
        sameAs: "target/release/screen-gif.exe",
        os: "win32",
      },
    ],
    pnpm: ["."],
  },
  {
    id: "screen-note",
    name: "Screen Note",
    dir: "apps/screen-note",
    version: { file: "src-tauri/tauri.conf.json", jsonKey: "version" },
    sources: ["src", "src-tauri", "index.html", "package.json", "pnpm-lock.yaml", "vite.config.ts"],
    builds: [
      { label: "릴리스 실행 파일", kind: "exe", path: "src-tauri/target/release/screen-note.exe", os: "win32" },
      { label: "설치 파일", kind: "nsis", path: "src-tauri/target/release/bundle/nsis", os: "win32" },
    ],
    installs: [
      {
        kind: "exe",
        label: "Windows 설치본",
        path: "%LOCALAPPDATA%/Screen Note/screen-note.exe",
        sameAs: "src-tauri/target/release/screen-note.exe",
        os: "win32",
      },
    ],
    pnpm: ["."],
  },
  {
    id: "today-ref",
    name: "오늘의레퍼런스",
    dir: "apps/today-ref",
    builds: todayRefBuilds,
    pnpm: ["."],
  },
  {
    id: "journal",
    name: "사용과 개발 기록",
    dir: "apps/journal",
    version: { file: "package.json", jsonKey: "version" },
    note: "소스를 바로 실행해 빌드 산출물과 설치본이 없습니다",
  },
  {
    id: "termkeys",
    name: "TermKeys",
    dir: "apps/termkeys",
    version: { file: "Info.plist", pattern: /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/ },
    os: "darwin",
  },
];

// 갤러리는 주제 파일을 빌드에 묶으므로 topic.ts와 topics/도 갤러리의 소스로 본다.
function todayRefBuilds(productDir) {
  const packageSources = ["src", "index.html", "package.json", "vite.config.ts"];
  const builds = [
    {
      label: "갤러리",
      kind: "dist",
      path: "gallery/dist",
      sources: [...packageSources.map((s) => `gallery/${s}`), "topic.ts", "topics", capturesDir(productDir)],
    },
    { label: "템플릿", kind: "dist", path: "template/dist", sources: [...packageSources, "public"].map((s) => `template/${s}`) },
  ];
  const worksDir = join(productDir, "works");
  const works = existsSync(worksDir) ? readdirSync(worksDir, { withFileTypes: true }).filter((e) => e.isDirectory()) : [];
  for (const work of works) {
    const base = `works/${work.name}`;
    builds.push({ label: `완성작 ${work.name}`, kind: "dist", path: `${base}/dist`, sources: [...packageSources, "public"].map((s) => `${base}/${s}`) });
  }
  return builds;
}

export function readSourceVersion(productDir, spec) {
  const file = join(productDir, spec.file);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  if (spec.jsonKey) return JSON.parse(text)[spec.jsonKey] ?? null;
  return text.match(spec.pattern)?.[1] ?? null;
}

// 소스 경로 중 가장 최근에 수정한 파일. 없는 경로는 건너뛴다.
export function newestSource(productDir, sourcePaths) {
  let newest = null;
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        if (!generatedDirs.has(entry)) visit(join(path, entry));
      }
    } else if (!newest || stat.mtimeMs > newest.mtimeMs) {
      newest = { path: relative(productDir, path).replaceAll("\\", "/"), mtimeMs: stat.mtimeMs };
    }
  };
  for (const source of sourcePaths) {
    const path = resolve(productDir, source);
    if (existsSync(path)) visit(path);
  }
  return newest;
}

export function parseDumpsysVersion(output) {
  return output.match(/versionName=(\S+)/)?.[1] ?? null;
}

export function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === "device")
    .map(([serial]) => serial);
}

// 설치 파일 이름의 버전("Screen Note_0.6.0_x64-setup.exe")과 수정 시각으로 가장 최근 설치 파일을 고른다.
function newestInstaller(dir) {
  if (!existsSync(dir)) return null;
  const installers = readdirSync(dir)
    .map((name) => ({ name, version: name.match(/_(\d+\.\d+\.\d+)_[^_]+-setup\.exe$/)?.[1] }))
    .filter((item) => item.version)
    .map((item) => ({ ...item, path: join(dir, item.name), mtimeMs: statSync(join(dir, item.name)).mtimeMs }));
  installers.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return installers[0] ?? null;
}

// 산출물의 위치, 버전과 만든 시각. 산출물이 없으면 null.
function readArtifact(productDir, build, probes) {
  const path = join(productDir, build.path);
  if (build.kind === "nsis") {
    const installer = newestInstaller(path);
    return installer && { path: installer.path, version: installer.version, mtimeMs: installer.mtimeMs };
  }
  if (build.kind === "apk") {
    const metadataFile = join(path, "output-metadata.json");
    if (!existsSync(metadataFile)) return null;
    const metadata = JSON.parse(readFileSync(metadataFile, "utf8"));
    const element = metadata.elements?.[0];
    const apk = element && join(path, element.outputFile);
    if (!apk || !existsSync(apk)) return null;
    return { path: apk, version: element.versionName ?? null, mtimeMs: statSync(apk).mtimeMs };
  }
  if (!existsSync(path)) return null;
  if (build.kind === "dist") {
    const index = join(path, "index.html");
    const stat = statSync(index, { throwIfNoEntry: false });
    return stat?.isFile() ? { path: index, version: null, mtimeMs: stat.mtimeMs } : null;
  }
  return { path, version: probes.exeVersion(path), mtimeMs: statSync(path).mtimeMs };
}

export function checkBuild(productDir, build, sourceVersion, productSources, probes) {
  const artifact = readArtifact(productDir, build, probes);
  if (!artifact) return { label: build.label, state: "missing", detail: `${build.path}에 산출물 없음` };
  const built = `${formatTime(artifact.mtimeMs)} 빌드`;
  if (sourceVersion && artifact.version && artifact.version !== sourceVersion) {
    return { label: build.label, state: "old", detail: `${artifact.version}, 소스는 ${sourceVersion} (${built})` };
  }
  const changed = newestSource(productDir, build.sources ?? productSources);
  if (changed && changed.mtimeMs > artifact.mtimeMs) {
    return { label: build.label, state: "old", detail: `빌드 뒤 소스가 바뀜: ${changed.path} ${formatTime(changed.mtimeMs)} (${built})` };
  }
  if (build.kind !== "dist" && !sourceVersion) {
    return { label: build.label, state: "unchecked", detail: `소스 버전을 읽지 못함 (${built})` };
  }
  const version = artifact.version ? `${artifact.version}, ` : "";
  return { label: build.label, state: "ok", detail: `${version}${built}, 그 뒤 소스 변경 없음` };
}

function checkExeInstall(productDir, install, sourceVersion, probes) {
  const path = expandEnv(install.path);
  if (!path) return [{ label: install.label, state: "unchecked", detail: `${install.path}의 환경 변수를 읽지 못함` }];
  if (!existsSync(path)) return [{ label: install.label, state: "missing", detail: `${path}에 설치본 없음` }];
  const version = probes.exeVersion(path);
  const installed = `${formatTime(statSync(path).mtimeMs)} 파일`;
  if (sourceVersion && version !== sourceVersion) {
    return [{ label: install.label, state: "old", detail: `${version ?? "버전 정보 없음"}, 소스는 ${sourceVersion} (${installed})` }];
  }
  const build = join(productDir, install.sameAs);
  if (existsSync(build) && sha256(build) !== sha256(path)) {
    return [{ label: install.label, state: "old", detail: `${version}이지만 ${install.sameAs}와 내용이 다름 (${installed}, 빌드 ${formatTime(statSync(build).mtimeMs)})` }];
  }
  if (!sourceVersion) return [{ label: install.label, state: "unchecked", detail: `소스 버전을 읽지 못함 (${installed})` }];
  const same = existsSync(build) ? `, ${install.sameAs}와 같은 파일` : "";
  return [{ label: install.label, state: "ok", detail: `${version} (${installed})${same}` }];
}

function checkAndroidInstall(install, sourceVersion, probes) {
  let devices;
  try {
    devices = probes.androidDevices();
  } catch {
    return [{ label: "Android 기기", state: "unchecked", detail: "adb 기기 목록 조회 실패" }];
  }
  if (devices === null) return [{ label: "Android 기기", state: "unchecked", detail: "adb를 찾지 못함" }];
  if (devices.length === 0) return [{ label: "Android 기기", state: "unchecked", detail: "연결된 기기나 가상 기기 없음" }];
  return devices.map((serial) => {
    const label = `기기 ${serial}`;
    let version;
    try {
      version = probes.androidVersion(serial, install.packageId);
    } catch {
      return { label, state: "unchecked", detail: `${install.packageId} 설치 버전 조회 실패` };
    }
    if (!version) return { label, state: "missing", detail: `${install.packageId} 설치 안 됨` };
    if (!sourceVersion) return { label, state: "unchecked", detail: `설치 버전 ${version}, 소스 버전을 읽지 못함` };
    if (version !== sourceVersion) return { label, state: "old", detail: `${version}, 소스는 ${sourceVersion}` };
    return { label, state: "ok", detail: version };
  });
}

// pnpm은 설치할 때 lockfile 사본을 node_modules/.pnpm/lock.yaml에 쓴다. 그 뒤에 lockfile이 바뀌었으면 다시 설치해야 한다.
export function checkPnpmInstall(productDir, folder) {
  const label = folder === "." ? "의존성" : `의존성 ${folder}`;
  const lockfile = join(productDir, folder, "pnpm-lock.yaml");
  const installed = join(productDir, folder, "node_modules", ".pnpm", "lock.yaml");
  if (!existsSync(lockfile)) return { label, state: "unchecked", detail: "pnpm-lock.yaml 없음" };
  if (!existsSync(installed)) return { label, state: "missing", detail: "pnpm install을 하지 않음" };
  const lockTime = statSync(lockfile).mtimeMs;
  const installTime = statSync(installed).mtimeMs;
  if (lockTime > installTime) {
    return { label, state: "old", detail: `마지막 설치(${formatTime(installTime)}) 뒤 pnpm-lock.yaml이 바뀜(${formatTime(lockTime)})` };
  }
  return { label, state: "ok", detail: `${formatTime(installTime)} 설치, 그 뒤 lockfile 변경 없음` };
}

export function checkProduct(root, product, probes, platform = process.platform) {
  const productDir = join(root, product.dir);
  const result = { id: product.id, name: product.name, dir: product.dir, version: null, checks: [], note: product.note ?? null };
  if (product.version) result.version = readSourceVersion(productDir, product.version);
  if (product.os && product.os !== platform) {
    result.note = `${osName(product.os)} 전용이라 이 머신에서 점검하지 않습니다`;
    return result;
  }
  const builds = typeof product.builds === "function" ? product.builds(productDir) : (product.builds ?? []);
  for (const build of builds) {
    if (build.os && build.os !== platform) continue;
    result.checks.push(checkBuild(productDir, build, result.version, product.sources ?? [], probes));
  }
  for (const install of product.installs ?? []) {
    if (install.os && install.os !== platform) continue;
    const checks = install.kind === "android"
      ? checkAndroidInstall(install, result.version, probes)
      : checkExeInstall(productDir, install, result.version, probes);
    result.checks.push(...checks);
  }
  for (const folder of product.pnpm ?? []) result.checks.push(checkPnpmInstall(productDir, folder));
  return result;
}

export function checkNodeVersion(root, runningVersion = process.versions.node) {
  const file = join(root, ".node-version");
  if (!existsSync(file)) return { state: "unchecked", detail: ".node-version 없음" };
  const wanted = readFileSync(file, "utf8").trim().replace(/^v/, "");
  if (wanted !== runningVersion) return { state: "old", detail: `실행 중인 Node ${runningVersion}, .node-version은 ${wanted}` };
  return { state: "ok", detail: `Node ${runningVersion}, .node-version과 같음` };
}

// 운영체제 기능을 부르는 부분. 테스트는 이 객체를 바꿔 끼운다.
export function systemProbes(platform = process.platform) {
  const adb = findAdb(platform);
  const adbOptions = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000 };
  return {
    exeVersion(path) {
      if (platform !== "win32") return null;
      const output = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", "(Get-Item -LiteralPath $env:BUILD_STATUS_PATH).VersionInfo.ProductVersion"],
        { env: { ...process.env, BUILD_STATUS_PATH: path }, encoding: "utf8" },
      );
      return output.trim() || null;
    },
    // adb devices는 adb 서버가 꺼져 있으면 켜고 그 안내를 stderr에 쓴다. 보고에 섞이지 않게 stderr는 버린다.
    androidDevices() {
      if (!adb) return null;
      return parseAdbDevices(execFileSync(adb, ["devices"], adbOptions));
    },
    androidVersion(serial, packageId) {
      const output = execFileSync(adb, ["-s", serial, "shell", "dumpsys", "package", packageId], adbOptions);
      return parseDumpsysVersion(output);
    },
  };
}

function findAdb(platform) {
  const exe = platform === "win32" ? "adb.exe" : "adb";
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    platform === "win32" ? process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Android", "Sdk") : join(homedir(), "Library", "Android", "sdk"),
  ];
  for (const sdkRoot of sdkRoots) {
    const adb = sdkRoot && join(sdkRoot, "platform-tools", exe);
    if (adb && existsSync(adb)) return adb;
  }
  return null;
}

function expandEnv(path) {
  let missing = false;
  const expanded = path.replace(/%([A-Z_]+)%/g, (_, name) => {
    if (!process.env[name]) missing = true;
    return process.env[name] ?? "";
  });
  return missing ? null : resolve(expanded);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function osName(platform) {
  return { darwin: "macOS", win32: "Windows", linux: "Linux" }[platform] ?? platform;
}

function formatTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const stateLabels = { ok: "최신", old: "오래됨", missing: "없음", unchecked: "미확인" };

function printReport(node, results, platform) {
  const lines = [`[${stateLabels[node.state]}] ${node.detail}`, ""];
  for (const product of results) {
    const version = product.version ? ` 소스 ${product.version}` : "";
    lines.push(`${product.name} (${product.dir})${version}`);
    if (product.note) lines.push(`  ${product.note}`);
    for (const check of product.checks) lines.push(`  [${stateLabels[check.state]}] ${check.label}: ${check.detail}`);
    lines.push("");
  }
  if (platform !== "win32") lines.push("이 운영체제의 설치본 대조는 아직 없습니다. macOS 설치본은 docs/development.md의 절차로 확인합니다.");
  console.log(lines.join("\n").trimEnd());
}

function main(args) {
  const unknown = args.filter((arg) => arg !== "--json");
  if (unknown.length > 0) {
    console.error(`알 수 없는 인자: ${unknown.join(" ")}\n사용법: node scripts/build-status.mjs [--json]`);
    return 2;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const probes = systemProbes();
  const node = checkNodeVersion(root);
  const results = products.map((product) => checkProduct(root, product, probes));
  if (args.includes("--json")) console.log(JSON.stringify({ node, products: results }, null, 2));
  else printReport(node, results, process.platform);
  const states = [node.state, ...results.flatMap((product) => product.checks.map((check) => check.state))];
  return states.some((state) => state === "old" || state === "missing") ? 1 : 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
