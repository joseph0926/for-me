// 주제 파일, 캡처와 완성작 폴더를 검사한다. 사용: node scripts/check.ts [today-ref 폴더] [--topic <주제 id>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { collectTopics, isTopicId, limits, parseTopicFile, workFolder, type TopicFile } from "../topic.ts";
import { capturesDir, capturesRepo } from "./captures.ts";

export interface TopicReport {
  folder: string;
  errors: string[];
  // 캡처는 다른 사본에 없을 수 있어 빠진 파일은 오류가 아니라 경고다.
  warnings: string[];
}

// 진행 절차 6단계(tastepin 다듬기)의 전달 기록. 취향 원장은 tools 저장소가 소유하고, 실행 진입점
// (~/dev/p/tools/taste/taste.py)이 정한 기록 폴더에 apply-context가 실행한 폴더를 project로 남긴다.
export const defaultDeliveries =
  process.env.TODAY_REF_TASTE_DELIVERIES ?? join(homedir(), "dev", "p", "tools", "taste", "state", "deliveries.jsonl");

// topic을 주면 그 주제만 검사한다. 같은 사본에서 다른 세션이 만들고 있는 주제는 중간 상태라 전체 검사를 실패시키는데,
// 주제끼리 비교하는 검사가 없어 범위를 좁혀도 놓치는 검사는 없다.
export function checkWorkspace(
  root: string,
  deliveries: string | null = defaultDeliveries,
  captures: string = capturesDir(root),
  topic: string | null = null,
): TopicReport[] {
  const topicsDir = join(root, "topics");
  if (topic !== null && !isTopicId(topic)) {
    return [{ folder: topic, errors: ["--topic은 주제 id여야 합니다 (예: 2026-11-18-chat)"], warnings: [] }];
  }
  if (!existsSync(topicsDir)) {
    return topic === null ? [] : [{ folder: topic, errors: ["topics 폴더가 없습니다"], warnings: [] }];
  }
  const refined = deliveries === null ? null : refinedWorks(deliveries);

  const folders =
    topic !== null
      ? [topic]
      : readdirSync(topicsDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
  const files = folders.map((folder) => readTopicFile(folder, join(topicsDir, folder, "topic.json")));

  return collectTopics(files).map(({ folder, result }) => {
    if (!result.ok) return { folder, errors: result.errors, warnings: [] };

    const report: TopicReport = { folder, errors: [], warnings: [] };
    for (const reference of result.topic.references) {
      for (const name of reference.captures) {
        checkCapture(join(captures, folder, name), `${reference.id} ${name}`, report);
      }
    }
    const needsWork = result.topic.status === "building" || result.topic.status === "done";
    if (needsWork && !existsSync(join(root, workFolder(folder), "package.json"))) {
      report.errors.push(`${result.topic.status} 상태인데 ${workFolder(folder)}가 없습니다`);
    } else if (result.topic.status === "done" && refined !== null && !refined.has(folder)) {
      report.warnings.push(`${workFolder(folder)}에서 실행한 tastepin 다듬기 전달 기록이 없습니다 (진행 절차 6단계)`);
    }
    return report;
  });
}

// 완성작 폴더에서 apply-context를 실행한 전달 기록의 주제 id. 원장이 없는 사본(다른 머신, 클라우드)에서는 null로 검사를 건너뛴다.
// apps/today-ref에서 실행한 기록은 어느 완성작인지 알 수 없어 세지 않는다.
export function refinedWorks(path: string): Set<string> | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  const works = new Set<string>();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let project: unknown;
    try {
      project = (JSON.parse(line) as { project?: unknown }).project;
    } catch {
      continue;
    }
    if (typeof project !== "string") continue;
    const match = /today-ref\/works\/([^/]+)\/?$/.exec(project.replaceAll("\\", "/"));
    if (match) works.add(match[1]);
  }
  return works;
}

// 원장이 없어 다듬기 전달 기록 검사를 건너뛰면 그 사실을 출력에 보인다. 조용히 건너뛰면 경로가 틀린 사본에서도
// 6단계를 마친 것처럼 읽힌다(2026-11-26 클라우드 사본에서 원장이 다른 경로에 있어 검사가 돌지 않았다).
export function deliveriesNotice(path: string, refined: Set<string> | null): string | null {
  if (refined !== null) return null;
  return `건너뜀: 취향 원장 ${path}를 읽지 못해 tastepin 다듬기 전달 기록 검사를 하지 않았습니다. 다른 경로면 TODAY_REF_TASTE_DELIVERIES로 줍니다`;
}

// 어느 캡처 폴더를 검사했는지 보인다. 빠진 캡처 경고가 비공개 저장소를 받지 않아서인지 구분하게 한다.
export function capturesNotice(root: string, captures: string): string {
  if (captures === join(root, "captures")) {
    return `캡처 폴더: ${captures} (${capturesRepo} 저장소가 없어 이 사본 안의 폴더를 씁니다. 다른 컴퓨터의 캡처는 README의 캡처 저장소 절을 따릅니다)`;
  }
  return `캡처 폴더: ${captures}`;
}

function readTopicFile(folder: string, path: string): TopicFile {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code;
    const readError = reason === "ENOENT" ? "topic.json이 없습니다" : `topic.json을 읽지 못했습니다 (${reason})`;
    return { folder, readError };
  }
  return parseTopicFile(folder, raw);
}

function checkCapture(path: string, label: string, report: TopicReport) {
  let head: Buffer;
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      report.errors.push(`${label}: 일반 파일이 아닙니다`);
      return;
    }
    if (stat.size > limits.captureBytes) {
      report.errors.push(`${label}: ${limits.captureBytes / 1024 / 1024}MB를 넘습니다`);
      return;
    }
    head = readFileSync(path).subarray(0, 16);
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code;
    if (reason === "ENOENT") report.warnings.push(`${label}: 캡처 파일이 이 사본에 없습니다`);
    else report.errors.push(`${label}: 캡처를 읽지 못했습니다 (${reason})`);
    return;
  }
  const detected = imageType(head);
  const expected = extname(path).slice(1).replace("jpeg", "jpg");
  if (detected === null) report.errors.push(`${label}: 이미지 파일이 아닙니다`);
  else if (detected !== expected) report.errors.push(`${label}: 실제 형식은 ${detected}입니다`);
}

function imageType(head: Buffer): string | null {
  const ascii = (start: number, end: number) => head.subarray(start, end).toString("latin1");
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (ascii(4, 12) === "ftypavif") return "avif";
  return null;
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({ options: { topic: { type: "string" } }, allowPositionals: true });
  const root = resolve(positionals[0] ?? join(import.meta.dirname, ".."));
  const topic = values.topic ?? null;
  const captures = capturesDir(root);
  const reports = checkWorkspace(root, defaultDeliveries, captures, topic);
  const notice = deliveriesNotice(defaultDeliveries, refinedWorks(defaultDeliveries));
  for (const { folder, errors, warnings } of reports) {
    console.log(`${errors.length === 0 ? "통과" : "실패"} ${folder}`);
    for (const message of errors) console.log(`  오류: ${message}`);
    for (const message of warnings) console.log(`  경고: ${message}`);
  }
  const failed = reports.filter((report) => report.errors.length > 0).length;
  if (notice) console.log(notice);
  console.log(capturesNotice(root, captures));
  const scope = topic === null ? "" : ` (${topic}만 검사. 다른 주제는 보지 않았습니다)`;
  console.log(`주제 ${reports.length}개, 실패 ${failed}개${scope}`);
  process.exitCode = failed > 0 ? 1 : 0;
}
