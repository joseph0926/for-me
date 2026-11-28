// 환경 사이 게시(r3)와 게시 실패(r4). 원본 환경과 대상 환경의 칸별 차이를 보고, 한 설정을 열어 고른 항목만 덮어쓴다.
import { motion } from "motion/react";
import { useEffect, useRef, useState, type Dispatch } from "react";

import { navigate, type SettingsAction } from "../App";
import { publishedFade } from "../motion";
import {
  compareFields,
  differingFields,
  differs,
  envLabel,
  envs,
  fieldText,
  type EnvId,
  type FieldId,
  type Setting,
} from "../settings";
import { Button, Checkbox, Dropdown, Icon, QuietButton } from "../ui";

type Published = { key: string; target: EnvId; fields: FieldId[] } | null;

export function PublishScreen({
  settings,
  dispatch,
  openKey,
}: {
  settings: Setting[];
  dispatch: Dispatch<SettingsAction>;
  openKey: string | null;
}) {
  const [source, setSource] = useState<EnvId>("staging");
  const [target, setTarget] = useState<EnvId>("prod");
  const [published, setPublished] = useState<Published>(null);
  // 화면을 연 뒤 운영으로 가는 첫 게시는 저장소 응답 없음으로 실패한다. 다시 시도는 성공한다.
  const [prodFailedOnce, setProdFailedOnce] = useState(false);

  const active = settings.filter((setting) => !setting.archived);
  const opened = openKey ? active.find((setting) => setting.key === openKey) ?? null : null;

  const pickSource = (env: EnvId) => {
    if (env === target) setTarget(source);
    setSource(env);
    setPublished(null);
  };
  const pickTarget = (env: EnvId) => {
    if (env === source) setSource(target);
    setTarget(env);
    setPublished(null);
  };
  const swap = () => {
    setSource(target);
    setTarget(source);
    setPublished(null);
  };

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-8">
      <h1 className="text-[22px] font-semibold">게시</h1>

      <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
        <EnvPicker label="원본 환경" value={source} onChange={pickSource} />
        <Icon name="arrow" className="mb-2.5 size-4 text-muted" />
        <EnvPicker label="대상 환경" value={target} onChange={pickTarget} />
        <Button onClick={swap}>
          <Icon name="swap" className="size-3.5" />
          환경 바꾸기
        </Button>
      </div>

      {opened ? (
        <CopyDetail
          key={`${opened.key}-${source}-${target}`}
          setting={opened}
          source={source}
          target={target}
          shouldFail={target === "prod" && !prodFailedOnce}
          onFailed={() => setProdFailedOnce(true)}
          onPublish={(fields) => {
            dispatch({ type: "publish", key: opened.key, source, target, fields });
            setPublished({ key: opened.key, target, fields });
          }}
        />
      ) : (
        <CompareTable settings={active} source={source} target={target} published={published} />
      )}
    </main>
  );
}

function EnvPicker({ label, value, onChange }: { label: string; value: EnvId; onChange: (env: EnvId) => void }) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold">{label}</div>
      <Dropdown
        ariaLabel={label}
        value={value}
        options={envs.map((env) => ({ value: env.id, label: env.label }))}
        onChange={onChange}
      />
    </div>
  );
}

function CompareTable({
  settings,
  source,
  target,
  published,
}: {
  settings: Setting[];
  source: EnvId;
  target: EnvId;
  published: Published;
}) {
  // 게시한 뒤에도 행이 움직이지 않게 이름순으로만 세운다.
  const rows = settings
    .map((setting) => ({ setting, differing: differingFields(setting, source, target) }))
    .sort((a, b) => a.setting.name.localeCompare(b.setting.name, "ko"));
  const differentCount = rows.filter((row) => row.differing.length > 0).length;

  return (
    <section aria-label="환경 비교" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px]">
          {differentCount > 0 ? (
            <>
              <strong className="font-semibold">{differentCount}개 설정</strong>에서 {envLabel(source)}과 {envLabel(target)}이 다릅니다
            </>
          ) : (
            <>두 환경의 설정이 모두 같습니다</>
          )}
        </p>
        <div className="flex items-center gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <DiffMark small />
            다름
          </span>
          <span className="flex items-center gap-1.5">
            <SameMark />
            같음
          </span>
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] tracking-[0.02em] text-muted">
            <th scope="col" className="px-3 py-2 font-medium">
              설정
            </th>
            {compareFields.map((field) => (
              <th key={field.id} scope="col" className="hidden w-[14%] px-2 py-2 text-center font-medium sm:table-cell">
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ setting, differing }) => (
            <tr key={setting.key} className="border-b border-line hover:bg-panel">
              <th scope="row" className="px-3 py-[11px] text-left font-normal">
                <button
                  type="button"
                  onClick={() => navigate(`/publish/${encodeURIComponent(setting.key)}`)}
                  className="text-left text-[15px] font-semibold hover:text-accent hover:underline"
                >
                  {setting.name}
                </button>
                <div className="font-mono text-[12.5px] text-muted">{setting.key}</div>
                {/* 좁은 화면에서는 칸 대신 다른 항목 이름을 한 줄로 적는다. */}
                <p className="mt-1 flex items-center gap-1.5 text-[13px] sm:hidden">
                  {differing.length > 0 ? (
                    <>
                      <DiffMark small />
                      <span className="text-diff-ink">
                        다름:{" "}
                        {compareFields
                          .filter((field) => differing.includes(field.id))
                          .map((field) => field.label)
                          .join(", ")}
                      </span>
                    </>
                  ) : (
                    <>
                      <SameMark />
                      <span className="text-muted">모두 같음</span>
                    </>
                  )}
                </p>
              </th>
              {compareFields.map((field) => {
                const justPublished =
                  published?.key === setting.key && published.target === target && published.fields.includes(field.id);
                return (
                  <td key={field.id} className="hidden px-2 py-2 text-center sm:table-cell">
                    <motion.span
                      className="inline-grid size-9 place-items-center rounded-work"
                      initial={justPublished ? { backgroundColor: "var(--added)" } : false}
                      animate={{ backgroundColor: "rgba(0,0,0,0)" }}
                      transition={publishedFade}
                    >
                      {differing.includes(field.id) ? <DiffMark /> : <SameMark />}
                    </motion.span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// 실패에는 그때 게시하려던 항목을 남긴다. 원인 기록과 다시 시도는 이 항목을 쓰고, 실패 뒤 체크를 바꿔도 달라지지 않는다.
type PublishStatus =
  | { kind: "idle" }
  | { kind: "publishing" }
  | { kind: "failed"; startedAt: Date; fields: FieldId[] }
  | { kind: "done"; count: number };

function CopyDetail({
  setting,
  source,
  target,
  shouldFail,
  onFailed,
  onPublish,
}: {
  setting: Setting;
  source: EnvId;
  target: EnvId;
  shouldFail: boolean;
  onFailed: () => void;
  onPublish: (fields: FieldId[]) => void;
}) {
  const from = setting.envs[source];
  const to = setting.envs[target];
  const [checked, setChecked] = useState<FieldId[]>(() => differingFields(setting, source, target));
  const [status, setStatus] = useState<PublishStatus>({ kind: "idle" });

  const toCopy = checked.filter((field) => differs(from, to, field));
  const allChecked = checked.length === compareFields.length;

  // 게시는 누른 순간의 항목으로 끝낸다. 화면을 떠나면 끝나지 않은 게시를 버린다.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const startPublish = (fields: FieldId[]) => {
    setStatus({ kind: "publishing" });
    timer.current = window.setTimeout(() => {
      if (shouldFail) {
        onFailed();
        setStatus({ kind: "failed", startedAt: new Date(Date.now() - 10_900), fields });
      } else {
        onPublish(fields);
        setStatus({ kind: "done", count: fields.length });
      }
    }, 900);
  };

  const toggle = (field: FieldId, on: boolean) =>
    setChecked((current) => (on ? [...current, field] : current.filter((item) => item !== field)));

  const publishing = status.kind === "publishing";
  const done = status.kind === "done";

  return (
    <section aria-label={`${setting.name} 복사`} className="mt-6">
      <QuietButton onClick={() => navigate("/publish")}>
        <Icon name="back" className="size-3.5" />
        비교로 돌아가기
      </QuietButton>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="text-[15px] font-semibold">{setting.name}</h2>
        <span className="font-mono text-[12.5px] text-muted">{setting.key}</span>
      </div>

      {status.kind === "failed" && (
        <FailureCard
          target={target}
          count={status.fields.length}
          startedAt={status.startedAt}
          onRetry={() => startPublish(status.fields)}
        />
      )}
      {done && (
        <p role="status" className="mt-3 flex items-center gap-2 text-[15px]">
          <SameMark />
          <span>
            <strong className="font-semibold">{envLabel(target)}</strong>에 {status.count}개 항목을 게시했습니다.
          </span>
        </p>
      )}

      <p className="mt-4 text-[14px] text-muted">
        <strong className="font-semibold text-ink">{envLabel(target)}</strong>에 복사할 항목을 고르세요. 고른 항목은{" "}
        {envLabel(source)}의 값으로 덮어씁니다.
      </p>

      {/* 넓은 화면은 세 열, 좁은 화면은 항목 이름 아래에 두 값을 나란히 둔다. 값 칸마다 머리말을 붙여 열 머리 없이도 읽힌다. */}
      <div className="mt-2 text-[14px]">
        <div className="grid grid-cols-2 items-center gap-x-3 border-b border-line px-3 py-2 text-[12px] tracking-[0.02em] text-muted sm:grid-cols-[30%_1fr_1fr]">
          <span className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
            <Checkbox
              label="모든 항목 고르기"
              checked={allChecked}
              indeterminate={checked.length > 0 && !allChecked}
              onChange={(on) => setChecked(on ? compareFields.map((field) => field.id) : [])}
            />
            전체 선택
          </span>
          <span className="hidden font-medium sm:block">{envLabel(target)}의 현재 값</span>
          <span className="hidden font-medium sm:block">{envLabel(source)}에서 복사한 뒤 값</span>
        </div>
        <ul>
          {compareFields.map((field) => {
            const isChecked = checked.includes(field.id);
            const changes = isChecked && differs(from, to, field.id);
            const after = isChecked ? from : to;
            const mono = field.id === "offVariant";
            return (
              <li
                key={field.id}
                className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line px-3 py-[11px] sm:grid-cols-[30%_1fr_1fr] sm:items-start"
              >
                <span className="col-span-2 flex items-center gap-2.5 font-medium sm:col-span-1 sm:pt-1">
                  <Checkbox label={`${field.label} 복사`} checked={isChecked} onChange={(on) => toggle(field.id, on)} />
                  {field.label}
                </span>
                <div className="min-w-0 px-2 py-1">
                  <span className="mb-0.5 block text-[12px] text-muted sm:hidden">{envLabel(target)}의 현재 값</span>
                  <ValueText text={fieldText(setting, to, field.id)} mono={mono} />
                </div>
                <div className={`min-w-0 rounded-work px-2 py-1 ${changes ? "bg-added text-added-ink" : ""}`}>
                  <span className="mb-0.5 block text-[12px] opacity-75 sm:hidden">복사한 뒤 값</span>
                  <ValueText text={fieldText(setting, after, field.id)} mono={mono} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {!done && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {toCopy.length === 0 && <span className="mr-auto text-[13px] text-muted">고른 항목이 두 환경에서 이미 같습니다.</span>}
          <Button onClick={() => navigate("/publish")}>취소</Button>
          <Button tone="primary" disabled={toCopy.length === 0 || publishing} onClick={() => startPublish(toCopy)}>
            {publishing ? "게시 중" : `${envLabel(target)}에 ${toCopy.length}개 항목 게시`}
          </Button>
        </div>
      )}
    </section>
  );
}

function FailureCard({
  target,
  count,
  startedAt,
  onRetry,
}: {
  target: EnvId;
  count: number;
  startedAt: Date;
  onRetry: () => void;
}) {
  const time = (date: Date) =>
    [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":");
  const stoppedAt = new Date(startedAt.getTime() + 10_000);
  return (
    <div role="alert" className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-work bg-danger-soft px-3 py-2.5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-danger">
          <Icon name="alert" className="size-4 shrink-0" />
          {envLabel(target)}에 게시하지 못했습니다
        </p>
        <Button tone="primary" onClick={onRetry}>
          <Icon name="retry" className="size-3.5" />
          다시 시도
        </Button>
      </div>
      <div className="mt-3">
        <div className="text-[13px] font-semibold">원인</div>
        <pre className="mt-1 overflow-x-auto rounded-work bg-panel px-3 py-2 font-mono text-[12.5px] leading-6 whitespace-pre">
          {`${time(startedAt)}  ${envLabel(target)} 설정 저장소에 ${count}개 항목 쓰기를 요청했습니다\n${time(stoppedAt)}  10초 동안 응답이 없어 요청을 멈췄습니다`}
        </pre>
        <p className="mt-2 text-[14px] text-muted">
          {envLabel(target)}의 값은 바뀌지 않았습니다. 다시 시도하면 같은 항목을 다시 게시합니다.
        </p>
      </div>
    </div>
  );
}

function ValueText({ text, mono }: { text: string; mono: boolean }) {
  const face = mono ? "font-mono text-[13px]" : "text-[14px]";
  return <span className={`block leading-6 break-all whitespace-pre-wrap ${face}`}>{text}</span>;
}

function DiffMark({ small = false }: { small?: boolean }) {
  return (
    <span
      role="img"
      aria-label="다름"
      className={`grid shrink-0 place-items-center rounded-[3px] bg-diff text-diff-ink ${small ? "size-4" : "size-7"}`}
    >
      <Icon name="warn" className={small ? "size-2.5" : "size-3.5"} />
    </span>
  );
}

function SameMark() {
  return (
    <span role="img" aria-label="같음" className="grid size-4 shrink-0 place-items-center rounded-full bg-same text-panel">
      <Icon name="check" className="size-2.5" />
    </span>
  );
}
