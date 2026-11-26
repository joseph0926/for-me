// 오른쪽 조정 패널(r1): 묶음마다 제목, 초기화, 켜고 끄는 토글.
// 슬라이더 행은 tastepin 조정 패널 값을 따른다: 행 전체가 28px 막대이고 이름과 값을 막대 안 한 줄에 쓰며, 손잡이 없이 0 자리부터 값까지 면을 채운다.
import { motion } from "motion/react";

import { adjustGroups, neutralAdjust, type AdjustSpec, type EditState, type GroupId } from "../editor/state";
import { ResetIcon } from "./Icons";

interface AdjustPanelProps {
  edit: EditState;
  onEdit: (next: EditState, key?: string) => void;
  onSeal: () => void;
}

export function AdjustPanel({ edit, onEdit, onSeal }: AdjustPanelProps) {
  const setGroupEnabled = (id: GroupId, enabled: boolean) =>
    onEdit({ ...edit, disabledGroups: enabled ? edit.disabledGroups.filter((g) => g !== id) : [...edit.disabledGroups, id] });
  const anyChanged = adjustGroups.some((group) => group.specs.some((spec) => edit.adjust[spec.key] !== 0));

  return (
    <div className="flex flex-col gap-7 p-4">
      {adjustGroups.map((group) => {
        const enabled = !edit.disabledGroups.includes(group.id);
        const changed = group.specs.some((spec) => edit.adjust[spec.key] !== 0);
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`} className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <h3 id={`group-${group.id}`} className="flex-1 text-[16px] font-[650]">
                {group.title}
              </h3>
              <button
                type="button"
                aria-label={`${group.title} 초기화`}
                title={`${group.title} 초기화`}
                disabled={!changed}
                onClick={() => {
                  const adjust = { ...edit.adjust };
                  for (const spec of group.specs) adjust[spec.key] = 0;
                  onEdit({ ...edit, adjust });
                }}
                className="grid size-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)] disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <ResetIcon size={16} />
              </button>
              <Switch label={`${group.title} 켜기`} on={enabled} onChange={(next) => setGroupEnabled(group.id, next)} />
            </div>
            <div className={`flex flex-col gap-2 transition-opacity duration-200 ${enabled ? "" : "opacity-45"}`}>
              {group.specs.map((spec) => (
                <SliderRow
                  key={spec.key}
                  spec={spec}
                  value={edit.adjust[spec.key]}
                  onChange={(value) => onEdit({ ...edit, adjust: { ...edit.adjust, [spec.key]: value } }, `adjust-${spec.key}`)}
                  onCommit={onSeal}
                />
              ))}
            </div>
          </section>
        );
      })}
      <button
        type="button"
        disabled={!anyChanged && edit.disabledGroups.length === 0}
        onClick={() => onEdit({ ...edit, adjust: neutralAdjust, disabledGroups: [] })}
        className="h-9 rounded-md border border-[var(--line)] hover:bg-[var(--hover)] disabled:opacity-40 disabled:hover:bg-transparent"
      >
        조정 모두 초기화
      </button>
    </div>
  );
}

function SliderRow({ spec, value, onChange, onCommit }: { spec: AdjustSpec; value: number; onChange: (value: number) => void; onCommit: () => void }) {
  const fill = ((value - spec.min) / (spec.max - spec.min)) * 100;
  const zero = ((0 - spec.min) / (spec.max - spec.min)) * 100;
  const reset = () => {
    onChange(0);
    onCommit();
  };
  return (
    <div className="flex items-center gap-1">
      <label className="slider-row relative flex h-7 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-md bg-[var(--hover)] px-2.5">
        {/* 0에서 값 쪽으로만 채워 원본에서 얼마나 움직였는지 보이게 한다. 노출처럼 0이 가운데인 값은 가운데에서 좌우로 찬다. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 bg-[var(--fill)]"
          style={{ left: `${Math.min(fill, zero)}%`, width: `${Math.abs(fill - zero)}%` }}
        />
        {zero > 0 && <span aria-hidden="true" className="absolute inset-y-1.5 w-px bg-[var(--line)]" style={{ left: `${zero}%` }} />}
        <span className="pointer-events-none relative">{spec.label}</span>
        <span className={`pointer-events-none relative text-[13px] tabular-nums ${value === 0 ? "text-[var(--faint)]" : "text-[var(--ink)]"}`}>{value > 0 && spec.min < 0 ? `+${value}` : value}</span>
        {/* 막대 전체를 덮는 보이지 않는 range가 끌기와 방향키를 받는다. */}
        <input
          type="range"
          aria-label={spec.label}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
          min={spec.min}
          max={spec.max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          // 막대를 두 번 누르면 원본 값으로 돌아간다.
          onDoubleClick={reset}
        />
      </label>
      {/* 바뀐 행에만 그 값을 0으로 돌리는 아이콘을 둔다. 자리는 늘 비워 두어 막대 길이가 흔들리지 않게 한다. */}
      <button
        type="button"
        aria-label={`${spec.label} 초기화`}
        title={`${spec.label} 초기화`}
        onClick={reset}
        className={`grid size-7 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:text-[var(--ink)] ${value === 0 ? "invisible" : ""}`}
      >
        <ResetIcon size={14} />
      </button>
    </div>
  );
}

export function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-[var(--ink)]" : "bg-[var(--line)]"}`}
    >
      <motion.span
        className="absolute top-0.5 size-4 rounded-full bg-[var(--raised)] shadow-sm"
        animate={{ left: on ? 18 : 2 }}
        transition={{ type: "spring", visualDuration: 0.25, bounce: 0.15 }}
      />
    </button>
  );
}
