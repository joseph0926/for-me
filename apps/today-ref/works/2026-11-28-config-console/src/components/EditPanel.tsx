// 설정 값 편집(r2): 이름과 키, 설명, 값 종류에 따라 바뀌는 변형 칩, 꺼짐과 켜짐 값 요약, 닫을 수 있는 스키마 검증 칸.
// 오른쪽에서 들어오는 패널로 연다. 손댄 칸은 입력을 400ms 멈추면 검증하고, 저장을 누르면 모든 칸을 검증한다.
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { panel } from "../motion";
import {
  defaultVariants,
  hasErrors,
  validateDraft,
  valueKinds,
  type DraftErrors,
  type EnvConfig,
  type ProjectId,
  type Setting,
  type ValueKind,
} from "../settings";
import { Button, Dropdown, Icon, IconButton, QuietButton } from "../ui";
import { JsonEditor } from "./JsonEditor";

const maxVariants = 4;
// 입력을 이만큼 멈추면 손댄 칸을 검증한다(tastepin 입력 필드 값).
const checkPause = 400;
// 변형마다 다른 표식. 초록, 노랑, 빨강은 상태에 남겨 두고 쓰지 않는다.
const markers = ["bg-muted", "bg-accent", "bg-ink", "border-2 border-accent"];

function newSetting(project: ProjectId): Setting {
  const offEverywhere: EnvConfig = { enabled: false, rollout: 0, rules: [], offVariant: 0 };
  return {
    key: "",
    name: "",
    description: "",
    project,
    kind: "boolean",
    variants: defaultVariants("boolean"),
    schema: null,
    archived: false,
    createdOn: "2026-11-28",
    updatedMinutesAgo: 0,
    calls: { dev: 0, staging: 0, prod: 0 },
    envs: { dev: { ...offEverywhere }, staging: { ...offEverywhere }, prod: { ...offEverywhere } },
  };
}

// 칸 이름: name, key, schema, 변형은 v0, v1 ...
type FieldName = string;

export function EditPanel({
  setting,
  defaultProject,
  existingKeys,
  onSave,
  onClose,
}: {
  setting: Setting | null;
  defaultProject: ProjectId;
  existingKeys: string[];
  onSave: (setting: Setting) => void;
  onClose: () => void;
}) {
  const isNew = setting === null;
  const [draft, setDraft] = useState<Setting>(() => setting ?? newSetting(defaultProject));
  // 마지막으로 입력을 멈춘 때의 초안. 손댄 칸의 오류는 이 값으로 알린다.
  const [settled, setSettled] = useState<Setting>(draft);
  const [touched, setTouched] = useState<Set<FieldName>>(new Set());
  const [picked, setPicked] = useState(isNew ? 0 : 1);
  const [submitted, setSubmitted] = useState(false);
  const pauseTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pauseTimer.current), []);

  const otherKeys = new Set(existingKeys.filter((key) => key !== setting?.key));
  const errors = validateDraft(draft, otherKeys);
  const shown = visibleErrors(submitted ? errors : validateDraft(settled, otherKeys), submitted, touched);
  const editable = draft.kind !== "boolean";

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  const edit = (patch: Partial<Setting>, fields: FieldName[] = []) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (fields.length > 0) setTouched((current) => new Set([...current, ...fields]));
    window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => setSettled(next), checkPause);
  };

  const changeKind = (kind: ValueKind) => {
    // 종류가 바뀌면 값을 그 종류의 기본값으로 다시 두고, 환경의 꺼짐 값 위치도 처음으로 돌린다.
    const envs = Object.fromEntries(
      Object.entries(draft.envs).map(([env, config]) => [env, { ...config, offVariant: 0 }]),
    ) as Setting["envs"];
    edit({ kind, variants: defaultVariants(kind), schema: kind === "json" ? draft.schema : null, envs });
    setPicked(0);
  };

  const setVariant = (index: number, value: string) =>
    edit({ variants: draft.variants.map((variant, at) => (at === index ? value : variant)) }, [`v${index}`]);

  const addVariant = () => {
    const last = Number(draft.variants.at(-1));
    const next =
      draft.kind === "number" ? String(Number.isFinite(last) ? last + 1 : 0) : draft.kind === "json" ? "{}" : `새 값 ${draft.variants.length + 1}`;
    edit({ variants: [...draft.variants, next] });
    setPicked(draft.variants.length);
  };

  const removeVariant = (index: number) => {
    // 뺀 값보다 뒤에 있던 꺼짐 값 위치를 한 칸 당기고, 뺀 값을 쓰던 환경은 첫 값으로 돌린다.
    const envs = Object.fromEntries(
      Object.entries(draft.envs).map(([env, config]) => {
        const offVariant = config.offVariant === index ? 0 : config.offVariant > index ? config.offVariant - 1 : config.offVariant;
        return [env, { ...config, offVariant }];
      }),
    ) as Setting["envs"];
    edit({ variants: draft.variants.filter((_, at) => at !== index), envs });
    setPicked(Math.max(0, index - 1));
  };

  const save = () => {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-40">
      <motion.div
        className="absolute inset-0 bg-[var(--backdrop)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={panel}
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={panel}
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-line bg-panel"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-3 pl-5">
          <h2 id="edit-title" className="text-[15px] font-semibold">
            {isNew ? "새 설정" : "설정 고치기"}
          </h2>
          <IconButton label="닫기" icon="close" onClick={onClose} />
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="이름" required error={shown.name}>
              <input
                value={draft.name}
                onChange={(event) => edit({ name: event.target.value }, ["name"])}
                aria-label="이름"
                aria-invalid={Boolean(shown.name)}
                className={inputClass(Boolean(shown.name))}
              />
            </Field>
            <Field label="키" required error={shown.key} helper="만든 뒤에는 키를 바꿀 수 없습니다.">
              <input
                value={draft.key}
                onChange={(event) => edit({ key: event.target.value }, ["key"])}
                disabled={!isNew}
                aria-label="키"
                aria-invalid={Boolean(shown.key)}
                placeholder="checkout.new-flow"
                className={`${inputClass(Boolean(shown.key))} font-mono text-[13px] disabled:bg-surface disabled:text-muted`}
              />
            </Field>
          </div>

          <Field label="설명">
            <textarea
              value={draft.description}
              onChange={(event) => edit({ description: event.target.value })}
              aria-label="설명"
              rows={2}
              className={`${inputClass(false)} h-auto resize-y py-2`}
            />
          </Field>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold">값</div>
            <Dropdown
              ariaLabel="값 종류"
              value={draft.kind}
              options={valueKinds.map((kind) => ({ value: kind.id, label: kind.label }))}
              onChange={changeKind}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {draft.variants.map((variant, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPicked(index)}
                  aria-pressed={editable ? picked === index : undefined}
                  aria-label={`${index + 1}번째 값`}
                  className={`flex h-9 max-w-full items-center gap-2 rounded-work border px-3 font-mono text-[13px] ${
                    shown.variants[index]
                      ? "border-danger"
                      : picked === index && editable
                        ? "border-accent bg-accent-soft"
                        : "border-line-strong"
                  } ${editable ? "hover:bg-surface" : "cursor-default"}`}
                >
                  <span aria-hidden className={`size-2.5 shrink-0 rotate-45 ${markers[index]}`} />
                  <span className="max-w-[220px] truncate">{chipText(draft.kind, variant)}</span>
                </button>
              ))}
              {editable && draft.variants.length < maxVariants && (
                <button
                  type="button"
                  aria-label="값 더하기"
                  onClick={addVariant}
                  className="grid size-9 place-items-center rounded-work border border-line-strong text-muted hover:bg-surface hover:text-ink"
                >
                  <Icon name="plus" className="size-3.5" />
                </button>
              )}
            </div>

            {editable && draft.variants[picked] !== undefined && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">{picked + 1}번째 값</span>
                  {draft.variants.length > 2 && <QuietButton onClick={() => removeVariant(picked)}>이 값 빼기</QuietButton>}
                </div>
                {draft.kind === "json" ? (
                  <JsonEditor
                    label={`${picked + 1}번째 값 JSON`}
                    value={draft.variants[picked]}
                    onChange={(value) => setVariant(picked, value)}
                    invalid={Boolean(shown.variants[picked])}
                  />
                ) : (
                  <input
                    value={draft.variants[picked]}
                    onChange={(event) => setVariant(picked, event.target.value)}
                    aria-label={`${picked + 1}번째 값`}
                    inputMode={draft.kind === "number" ? "decimal" : undefined}
                    className={`${inputClass(Boolean(shown.variants[picked]))} font-mono text-[13px]`}
                  />
                )}
              </div>
            )}

            {Object.entries(shown.variants).map(([index, message]) => (
              <p key={index} className="mt-1.5 text-[13px] text-danger">
                {Number(index) + 1}번째 값: {message}
              </p>
            ))}

            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
              <span className="text-muted">새 환경 기본값</span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                꺼짐일 때
                <ValueMark index={0} text={chipText(draft.kind, draft.variants[0])} />
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                켜짐일 때
                <ValueMark index={1} text={chipText(draft.kind, draft.variants[1])} />
              </span>
            </p>
          </div>

          {draft.kind === "json" &&
            (draft.schema === null ? (
              <QuietButton onClick={() => edit({ schema: '{\n  "type": "object"\n}' })}>스키마 검증 더하기</QuietButton>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold">스키마 검증</div>
                    <p className="text-[13px] text-muted">type, required, properties, enum만 확인합니다.</p>
                  </div>
                  <IconButton label="스키마 검증 닫기" icon="close" onClick={() => edit({ schema: null })} />
                </div>
                <div className="mt-2">
                  <JsonEditor
                    label="스키마 JSON"
                    value={draft.schema}
                    onChange={(schema) => edit({ schema }, ["schema"])}
                    placeholder="JSON 스키마를 적으세요"
                    invalid={Boolean(shown.schema)}
                  />
                </div>
                {shown.schema && <p className="mt-1.5 text-[13px] text-danger">{shown.schema}</p>}
              </div>
            ))}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3">
          {submitted && hasErrors(errors) && <span className="mr-auto text-[13px] text-danger">고칠 곳이 있어 저장하지 않았습니다</span>}
          <Button onClick={onClose}>취소</Button>
          <Button tone="primary" onClick={save}>
            {isNew ? "만들기" : "저장"}
          </Button>
        </footer>
      </motion.section>
    </div>
  );
}

// 저장을 누르기 전에는 손댄 칸의 오류만 보인다.
function visibleErrors(errors: DraftErrors, submitted: boolean, touched: Set<FieldName>): DraftErrors {
  if (submitted) return errors;
  return {
    name: touched.has("name") ? errors.name : undefined,
    key: touched.has("key") ? errors.key : undefined,
    schema: touched.has("schema") ? errors.schema : undefined,
    variants: Object.fromEntries(Object.entries(errors.variants).filter(([index]) => touched.has(`v${index}`))),
  };
}

function Field({
  label,
  required = false,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[13px] text-danger">{error}</span>
      ) : (
        helper && <span className="mt-1 block text-[13px] text-muted">{helper}</span>
      )}
    </label>
  );
}

function ValueMark({ index, text }: { index: number; text: string }) {
  return (
    <span className="inline-flex max-w-[260px] items-center gap-1.5 font-mono text-[13px] font-semibold">
      <span aria-hidden className={`size-2.5 shrink-0 rotate-45 ${markers[index]}`} />
      <span className="truncate">{text}</span>
    </span>
  );
}

function inputClass(invalid: boolean) {
  return `h-10 w-full rounded-work border bg-panel px-3 text-[14px] focus:ring-1 ${
    invalid ? "border-danger focus:border-danger focus:ring-danger" : "border-line-strong focus:border-accent focus:ring-accent"
  }`;
}

// 칩에는 JSON을 한 줄로 줄여 보여 준다. 읽지 못하는 JSON은 적은 그대로 보인다.
function chipText(kind: ValueKind, value: string | undefined): string {
  if (value === undefined) return "";
  if (kind !== "json") return value === "" ? "(빈 값)" : value;
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value.replace(/\s+/g, " ");
  }
}
