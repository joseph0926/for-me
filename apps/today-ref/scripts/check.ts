// 주제 파일, 캡처와 완성작 폴더를 검사한다. 사용: node scripts/check.ts [today-ref 폴더]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { collectTopics, limits, parseTopicFile, workFolder, type TopicFile } from "../topic.ts";

export interface TopicReport {
  folder: string;
  errors: string[];
  // 캡처는 다른 사본에 없을 수 있어 빠진 파일은 오류가 아니라 경고다.
  warnings: string[];
}

export function checkWorkspace(root: string): TopicReport[] {
  const topicsDir = join(root, "topics");
  if (!existsSync(topicsDir)) return [];

  const files = readdirSync(topicsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readTopicFile(entry.name, join(topicsDir, entry.name, "topic.json")));

  return collectTopics(files).map(({ folder, result }) => {
    if (!result.ok) return { folder, errors: result.errors, warnings: [] };

    const report: TopicReport = { folder, errors: [], warnings: [] };
    for (const reference of result.topic.references) {
      for (const name of reference.captures) {
        checkCapture(join(root, "captures", folder, name), `${reference.id} ${name}`, report);
      }
    }
    const needsWork = result.topic.status !== "selecting";
    if (needsWork && !existsSync(join(root, workFolder(folder), "package.json"))) {
      report.errors.push(`${result.topic.status} 상태인데 ${workFolder(folder)}가 없습니다`);
    }
    return report;
  });
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
  const root = resolve(process.argv[2] ?? join(import.meta.dirname, ".."));
  const reports = checkWorkspace(root);
  for (const { folder, errors, warnings } of reports) {
    console.log(`${errors.length === 0 ? "통과" : "실패"} ${folder}`);
    for (const message of errors) console.log(`  오류: ${message}`);
    for (const message of warnings) console.log(`  경고: ${message}`);
  }
  const failed = reports.filter((report) => report.errors.length > 0).length;
  console.log(`주제 ${reports.length}개, 실패 ${failed}개`);
  process.exitCode = failed > 0 ? 1 : 0;
}
