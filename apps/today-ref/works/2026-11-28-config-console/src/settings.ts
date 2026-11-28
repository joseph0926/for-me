// 설정 값의 형식과 계산. 화면 컴포넌트는 이 파일의 함수로 거르고, 비교하고, 검증한다.

export const envs = [
  { id: "dev", label: "개발" },
  { id: "staging", label: "스테이징" },
  { id: "prod", label: "운영" },
] as const;
export type EnvId = (typeof envs)[number]["id"];

export const projects = [
  { id: "order-web", label: "주문 웹" },
  { id: "payments-api", label: "결제 API" },
  { id: "mobile-app", label: "모바일 앱" },
] as const;
export type ProjectId = (typeof projects)[number]["id"];

export const valueKinds = [
  { id: "boolean", label: "참거짓" },
  { id: "number", label: "숫자" },
  { id: "string", label: "문자열" },
  { id: "json", label: "JSON" },
] as const;
export type ValueKind = (typeof valueKinds)[number]["id"];

// 환경마다 따로 정하는 값. 변형 값 목록은 설정에 하나만 있고 모든 환경이 같이 쓴다.
export interface EnvConfig {
  enabled: boolean;
  // 켜졌을 때 켜짐 값을 받는 사용자 비율(%)
  rollout: number;
  rules: string[];
  // 꺼졌을 때 주는 변형의 위치
  offVariant: number;
}

export interface Setting {
  key: string;
  name: string;
  description: string;
  project: ProjectId;
  kind: ValueKind;
  // 변형 값은 입력한 글자 그대로 둔다. 0번이 꺼짐 값, 1번이 켜짐 값의 기본이다.
  variants: string[];
  schema: string | null;
  archived: boolean;
  createdOn: string;
  updatedMinutesAgo: number;
  calls: Record<EnvId, number>;
  envs: Record<EnvId, EnvConfig>;
}

export function envLabel(id: EnvId): string {
  return envs.find((env) => env.id === id)!.label;
}

export function projectLabel(id: ProjectId): string {
  return projects.find((project) => project.id === id)!.label;
}

export function kindLabel(id: ValueKind): string {
  return valueKinds.find((kind) => kind.id === id)!.label;
}

export function defaultVariants(kind: ValueKind): string[] {
  switch (kind) {
    case "boolean":
      return ["false", "true"];
    case "number":
      return ["0", "1"];
    case "string":
      return ["기존", "새 값"];
    case "json":
      return ['{"enabled": false}', '{"enabled": true}'];
  }
}

export function relativeTime(minutes: number): string {
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// ---- 목록 거르기와 정렬 ----

export const periods = [
  { id: "24h", label: "24시간", scale: 1 },
  { id: "7d", label: "7일", scale: 6.6 },
  { id: "30d", label: "30일", scale: 27.5 },
] as const;
export type PeriodId = (typeof periods)[number]["id"];

export const sortOptions = [
  { id: "recent", label: "최근 변경" },
  { id: "name", label: "이름" },
  { id: "calls", label: "호출 수" },
  { id: "created", label: "만든 날" },
] as const;
export type SortId = (typeof sortOptions)[number]["id"];

export interface ListQuery {
  text: string;
  activeOnly: boolean;
  project: ProjectId | "all";
  env: EnvId;
  period: PeriodId;
  sort: SortId;
}

export function callsIn(setting: Setting, env: EnvId, period: PeriodId): number {
  const scale = periods.find((p) => p.id === period)!.scale;
  return Math.round(setting.calls[env] * scale);
}

export function filterSettings(settings: Setting[], query: ListQuery): Setting[] {
  const text = query.text.trim().toLowerCase();
  const matched = settings.filter((setting) => {
    if (query.activeOnly && setting.archived) return false;
    if (query.project !== "all" && setting.project !== query.project) return false;
    if (text === "") return true;
    return setting.name.toLowerCase().includes(text) || setting.key.includes(text);
  });
  const byName = (a: Setting, b: Setting) => a.name.localeCompare(b.name, "ko");
  const compare: Record<SortId, (a: Setting, b: Setting) => number> = {
    recent: (a, b) => a.updatedMinutesAgo - b.updatedMinutesAgo,
    name: byName,
    calls: (a, b) => callsIn(b, query.env, query.period) - callsIn(a, query.env, query.period),
    created: (a, b) => b.createdOn.localeCompare(a.createdOn),
  };
  return [...matched].sort((a, b) => compare[query.sort](a, b) || byName(a, b));
}

// ---- 환경 비교와 복사 ----

export const compareFields = [
  { id: "enabled", label: "켜짐 상태" },
  { id: "rollout", label: "켜짐 비율" },
  { id: "rules", label: "대상 규칙" },
  { id: "offVariant", label: "꺼짐일 때 값" },
] as const;
export type FieldId = (typeof compareFields)[number]["id"];

export function fieldText(setting: Setting, config: EnvConfig, field: FieldId): string {
  switch (field) {
    case "enabled":
      return config.enabled ? "켜짐" : "꺼짐";
    case "rollout":
      return `${config.rollout}%`;
    case "rules":
      return config.rules.length === 0 ? "규칙 없음" : config.rules.join("\n");
    case "offVariant":
      return setting.variants[config.offVariant] ?? "";
  }
}

export function differs(source: EnvConfig, target: EnvConfig, field: FieldId): boolean {
  return JSON.stringify(source[field]) !== JSON.stringify(target[field]);
}

export function differingFields(setting: Setting, source: EnvId, target: EnvId): FieldId[] {
  return compareFields
    .map((field) => field.id)
    .filter((field) => differs(setting.envs[source], setting.envs[target], field));
}

// 고른 항목만 원본 환경의 값으로 덮어쓴 대상 환경 설정
export function copiedConfig(from: EnvConfig, to: EnvConfig, fields: FieldId[]): EnvConfig {
  const next: EnvConfig = { ...to, rules: [...to.rules] };
  for (const field of fields) {
    if (field === "rules") next.rules = [...from.rules];
    else if (field === "enabled") next.enabled = from.enabled;
    else if (field === "rollout") next.rollout = from.rollout;
    else next.offVariant = from.offVariant;
  }
  return next;
}

// ---- 편집 검증 ----

export const keyPattern = /^[a-z][a-z0-9.-]*$/;

export interface DraftErrors {
  name?: string;
  key?: string;
  schema?: string;
  variants: Record<number, string>;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Boolean(errors.name || errors.key || errors.schema) || Object.keys(errors.variants).length > 0;
}

export function validateDraft(draft: Setting, otherKeys: Set<string>): DraftErrors {
  const errors: DraftErrors = { variants: {} };
  if (draft.name.trim() === "") errors.name = "이름을 적어 주세요";
  if (draft.key === "") errors.key = "키를 적어 주세요";
  else if (!keyPattern.test(draft.key)) errors.key = "영문 소문자로 시작하고 소문자, 숫자, 점(.)과 하이픈(-)만 씁니다";
  else if (otherKeys.has(draft.key)) errors.key = "같은 키의 설정이 이미 있습니다";

  let schema: unknown = undefined;
  if (draft.kind === "json" && draft.schema !== null && draft.schema.trim() !== "") {
    const parsed = parseJson(draft.schema);
    if (parsed.ok) schema = parsed.value;
    else errors.schema = `스키마를 읽지 못했습니다: ${parsed.message}`;
  }

  const seen = new Map<string, number>();
  draft.variants.forEach((raw, index) => {
    const problem = variantProblem(draft.kind, raw, schema);
    if (problem) {
      errors.variants[index] = problem;
      return;
    }
    const normalized = draft.kind === "json" ? JSON.stringify(JSON.parse(raw)) : raw.trim();
    const earlier = seen.get(normalized);
    if (earlier !== undefined) errors.variants[index] = `${earlier + 1}번째 값과 같습니다`;
    else seen.set(normalized, index);
  });
  return errors;
}

function variantProblem(kind: ValueKind, raw: string, schema: unknown): string | null {
  if (raw.trim() === "") return "값을 적어 주세요";
  if (kind === "number" && !Number.isFinite(Number(raw))) return "숫자가 아닙니다";
  if (kind !== "json") return null;
  const parsed = parseJson(raw);
  if (!parsed.ok) return `JSON 문법 오류: ${parsed.message}`;
  if (schema === undefined) return null;
  return schemaProblem(schema, parsed.value, "값");
}

type Parsed = { ok: true; value: unknown } | { ok: false; message: string };

export function parseJson(text: string): Parsed {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, message: jsonErrorLine(text, error as Error) };
  }
}

// 브라우저마다 다른 JSON 오류 문구 대신 몇 번째 줄인지만 알린다.
function jsonErrorLine(text: string, error: Error): string {
  const position = Number(/position (\d+)/.exec(error.message)?.[1]);
  if (!Number.isFinite(position)) return "닫히지 않은 괄호나 따옴표가 있는지 보세요";
  const line = text.slice(0, position).split("\n").length;
  return `${line}번째 줄을 보세요`;
}

// JSON 스키마 중 type, required, properties, enum만 확인하는 작은 검사기
function schemaProblem(schema: unknown, value: unknown, at: string): string | null {
  if (typeof schema !== "object" || schema === null) return null;
  const rule = schema as { type?: string; required?: string[]; properties?: Record<string, unknown>; enum?: unknown[] };
  if (rule.enum && !rule.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) {
    return `${at}에는 허용한 값 ${rule.enum.map((item) => JSON.stringify(item)).join(", ")} 중 하나가 와야 합니다`;
  }
  if (rule.type && typeName(value) !== rule.type && !(rule.type === "number" && typeName(value) === "integer")) {
    return `${at}에는 ${rule.type} 값이 와야 하는데 ${typeName(value)} 값이 있습니다`;
  }
  if (typeName(value) !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const name of rule.required ?? []) {
    if (!(name in record)) return `스키마가 요구하는 "${name}" 항목이 없습니다`;
  }
  for (const [name, child] of Object.entries(rule.properties ?? {})) {
    if (!(name in record)) continue;
    const problem = schemaProblem(child, record[name], `"${name}"`);
    if (problem) return problem;
  }
  return null;
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}
