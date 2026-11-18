// 주제 파일(topics/<id>/topic.json)의 형식. AI가 쓰고 갤러리와 검사 명령이 읽는다.
// 두 경로가 이 파일 하나만 쓰도록 Node의 타입 제거 실행과 Vite가 함께 읽을 수 있는 문법만 쓴다.

export const limits = {
  references: 24,
  capturesPerReference: 6,
  pointsPerReference: 6,
  captureBytes: 5 * 1024 * 1024,
  shortText: 120,
  longText: 1000,
} as const;

export const platforms = ["web", "app"] as const;
export const referenceKinds = ["product", "gallery"] as const;
export const selectionModes = ["single", "combine"] as const;
// selecting: 사용자의 선택을 기다림. building: 선택이 확정되어 완성작을 만드는 중. done: 완성.
export const statuses = ["selecting", "building", "done"] as const;

export type Platform = (typeof platforms)[number];
export type ReferenceKind = (typeof referenceKinds)[number];
export type SelectionMode = (typeof selectionModes)[number];
export type Status = (typeof statuses)[number];

export interface Reference {
  id: string;
  kind: ReferenceKind;
  // 화면의 주인인 제품. 갤러리 사이트에서 찾은 화면도 원래 제품 이름을 쓴다.
  product: string;
  // 화면을 찾은 곳. 공식 사이트, App Store, Mobbin 등.
  source: string;
  title: string;
  url: string;
  checkedOn: string;
  // captures/<주제 id>/ 아래 파일 이름. 캡처는 공개 저장소에 넣지 않으므로 다른 사본에는 없을 수 있다.
  captures: string[];
  points: string[];
}

export interface SelectionItem {
  ref: string;
  // 이 레퍼런스에서 가져올 부분. 하나로 결정했다면 비워 둘 수 있다.
  part: string;
}

export interface Selection {
  mode: SelectionMode;
  items: SelectionItem[];
  decidedOn: string;
}

export interface Topic {
  id: string;
  date: string;
  title: string;
  platform: Platform;
  brief: string;
  references: Reference[];
  // 사용자가 확정한 선택. selecting 상태에서는 null이고 그 뒤로는 반드시 있다.
  selection: Selection | null;
  status: Status;
}

export type TopicResult = { ok: true; topic: Topic } | { ok: false; errors: string[] };

const topicIdPattern = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const referenceIdPattern = /^r[1-9]\d*$/;
const captureNamePattern = /^[a-z0-9][a-z0-9-]*\.(?:png|jpe?g|webp|gif|avif)$/;

export function isTopicId(value: string): boolean {
  return topicIdPattern.test(value) && isCalendarDate(value.slice(0, 10));
}

export function workFolder(topicId: string): string {
  return `works/${topicId}`;
}

export function workPackageName(topicId: string): string {
  return `work-${topicId}`;
}

export interface TopicEntry {
  folder: string;
  result: TopicResult;
}

export type TopicFile = { folder: string; data: unknown } | { folder: string; readError: string };

// 검사 명령은 파일 시스템에서, 갤러리는 Vite의 파일 묶음에서 같은 목록을 만든다.
// 잘못된 주제 하나가 다른 주제의 표시를 막지 않도록 주제마다 따로 판정한다. 최신 날짜가 먼저 온다.
export function collectTopics(files: TopicFile[]): TopicEntry[] {
  return files
    .map((file): TopicEntry => {
      if ("readError" in file) return { folder: file.folder, result: { ok: false, errors: [file.readError] } };
      return { folder: file.folder, result: validateTopic(file.data, file.folder) };
    })
    .sort((a, b) => b.folder.localeCompare(a.folder));
}

export function parseTopicFile(folder: string, raw: string): TopicFile {
  try {
    return { folder, data: JSON.parse(raw) };
  } catch (error) {
    return { folder, readError: `JSON을 읽지 못했습니다: ${(error as Error).message}` };
  }
}

// expectedId는 파일이 놓인 폴더 이름이다. 내용의 id와 폴더가 어긋나면 갤러리와 캡처 경로가 갈라진다.
export function validateTopic(input: unknown, expectedId?: string): TopicResult {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(message);

  if (!isRecord(input)) return { ok: false, errors: ["주제 파일이 객체가 아닙니다"] };

  const id = text(input.id, "id", limits.shortText, fail);
  if (id !== null && !isTopicId(id)) fail("id는 날짜-영문 소문자 형식이어야 합니다 (예: 2026-11-18-chat)");
  if (id !== null && expectedId !== undefined && id !== expectedId) fail(`id(${id})가 폴더 이름(${expectedId})과 다릅니다`);

  const date = text(input.date, "date", 10, fail);
  if (date !== null && !isCalendarDate(date)) fail("date는 YYYY-MM-DD여야 합니다");
  if (id !== null && date !== null && !id.startsWith(`${date}-`)) fail("id는 date로 시작해야 합니다");

  text(input.title, "title", limits.shortText, fail);
  text(input.brief, "brief", limits.longText, fail, true);
  oneOf(input.platform, platforms, "platform", fail);
  const status = oneOf(input.status, statuses, "status", fail);

  const referenceIds = new Set<string>();
  if (!Array.isArray(input.references)) {
    fail("references는 배열이어야 합니다");
  } else {
    if (input.references.length === 0) fail("references가 비어 있습니다");
    if (input.references.length > limits.references) fail(`references는 ${limits.references}개 이하여야 합니다`);
    input.references.slice(0, limits.references).forEach((reference, index) => {
      const referenceId = validateReference(reference, `references[${index}]`, fail);
      if (referenceId === null) return;
      if (referenceIds.has(referenceId)) fail(`레퍼런스 id ${referenceId}가 중복됩니다`);
      referenceIds.add(referenceId);
    });
  }

  if (input.selection === null) {
    if (status !== null && status !== "selecting") fail(`${status} 상태에는 확정한 selection이 있어야 합니다`);
  } else {
    if (status === "selecting") fail("selecting 상태에서는 selection이 null이어야 합니다");
    validateSelection(input.selection, referenceIds, fail);
  }

  return errors.length === 0 ? { ok: true, topic: input as unknown as Topic } : { ok: false, errors };
}

function validateReference(input: unknown, at: string, fail: (message: string) => void): string | null {
  if (!isRecord(input)) {
    fail(`${at}가 객체가 아닙니다`);
    return null;
  }
  const id = text(input.id, `${at}.id`, 8, fail);
  if (id !== null && !referenceIdPattern.test(id)) fail(`${at}.id는 r1, r2 형식이어야 합니다`);
  oneOf(input.kind, referenceKinds, `${at}.kind`, fail);
  text(input.product, `${at}.product`, limits.shortText, fail);
  text(input.source, `${at}.source`, limits.shortText, fail);
  text(input.title, `${at}.title`, limits.shortText, fail);

  const url = text(input.url, `${at}.url`, limits.longText, fail);
  if (url !== null && !isHttpsUrl(url)) fail(`${at}.url은 https 주소여야 합니다`);

  const checkedOn = text(input.checkedOn, `${at}.checkedOn`, 10, fail);
  if (checkedOn !== null && !isCalendarDate(checkedOn)) fail(`${at}.checkedOn은 YYYY-MM-DD여야 합니다`);

  list(input.captures, `${at}.captures`, limits.capturesPerReference, fail, (name, itemAt) => {
    if (!captureNamePattern.test(name)) fail(`${itemAt}는 영문 소문자, 숫자, -와 이미지 확장자만 쓸 수 있습니다`);
  });
  list(input.points, `${at}.points`, limits.pointsPerReference, fail, (point, itemAt) => {
    if (point.trim() === "") fail(`${itemAt}가 비어 있습니다`);
    if (point.length > limits.longText) fail(`${itemAt}는 ${limits.longText}자 이하여야 합니다`);
  });
  return id;
}

function validateSelection(input: unknown, referenceIds: Set<string>, fail: (message: string) => void) {
  if (!isRecord(input)) {
    fail("selection은 객체 또는 null이어야 합니다");
    return;
  }
  const mode = oneOf(input.mode, selectionModes, "selection.mode", fail);
  const decidedOn = text(input.decidedOn, "selection.decidedOn", 10, fail);
  if (decidedOn !== null && !isCalendarDate(decidedOn)) fail("selection.decidedOn은 YYYY-MM-DD여야 합니다");

  if (!Array.isArray(input.items)) {
    fail("selection.items는 배열이어야 합니다");
    return;
  }
  if (mode === "single" && input.items.length !== 1) fail("하나로 결정한 선택은 항목이 하나여야 합니다");
  if (mode === "combine" && input.items.length < 2) fail("조합한 선택은 항목이 두 개 이상이어야 합니다");

  const seen = new Set<string>();
  input.items.forEach((item, index) => {
    const at = `selection.items[${index}]`;
    if (!isRecord(item)) {
      fail(`${at}가 객체가 아닙니다`);
      return;
    }
    const ref = text(item.ref, `${at}.ref`, 8, fail);
    text(item.part, `${at}.part`, limits.longText, fail, true);
    if (mode === "combine" && typeof item.part === "string" && item.part.trim() === "") {
      fail(`${at}.part: 조합한 선택은 레퍼런스마다 가져올 부분이 정해져 있어야 합니다`);
    }
    if (ref === null) return;
    if (!referenceIds.has(ref)) fail(`${at}.ref ${ref}는 이 주제의 레퍼런스가 아닙니다`);
    if (seen.has(ref)) fail(`${at}.ref ${ref}가 중복됩니다`);
    seen.add(ref);
  });
}

function text(
  value: unknown,
  at: string,
  maxLength: number,
  fail: (message: string) => void,
  allowEmpty = false,
): string | null {
  if (typeof value !== "string") {
    fail(`${at}는 문자열이어야 합니다`);
    return null;
  }
  if (!allowEmpty && value.trim() === "") fail(`${at}가 비어 있습니다`);
  if (value.length > maxLength) fail(`${at}는 ${maxLength}자 이하여야 합니다`);
  return value;
}

function oneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
  at: string,
  fail: (message: string) => void,
): T | null {
  if (typeof value === "string" && (choices as readonly string[]).includes(value)) return value as T;
  fail(`${at}는 ${choices.join(", ")} 중 하나여야 합니다`);
  return null;
}

function list(
  value: unknown,
  at: string,
  maxItems: number,
  fail: (message: string) => void,
  checkItem: (item: string, itemAt: string) => void,
) {
  if (!Array.isArray(value)) {
    fail(`${at}는 배열이어야 합니다`);
    return;
  }
  if (value.length > maxItems) fail(`${at}는 ${maxItems}개 이하여야 합니다`);
  value.slice(0, maxItems).forEach((item, index) => {
    if (typeof item !== "string") fail(`${at}[${index}]는 문자열이어야 합니다`);
    else checkItem(item, `${at}[${index}]`);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
