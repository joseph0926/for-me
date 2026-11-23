// 오른쪽 조정 패널(r1): 묶음마다 제목, 되돌리기, 켜고 끄는 토글. 슬라이더는 이름과 값을 한 줄에 두고 그 아래 막대.
import { motion } from "motion/react";
import type { CSSProperties } from "react";

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
                aria-label={`${group.title} 값 되돌리기`}
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
            <div className={`flex flex-col gap-4 transition-opacity duration-200 ${enabled ? "" : "opacity-45"}`}>
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
  // 0에서 값 쪽으로만 채워 원본에서 얼마나 움직였는지 보이게 한다.
  const background = `linear-gradient(to right, var(--line) ${Math.min(fill, zero)}%, var(--ink) ${Math.min(fill, zero)}%, var(--ink) ${Math.max(fill, zero)}%, var(--line) ${Math.max(fill, zero)}%)`;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span>{spec.label}</span>
        <span className={`text-[13px] tabular-nums ${value === 0 ? "text-[var(--faint)]" : "text-[var(--ink)]"}`}>{value > 0 && spec.min < 0 ? `+${value}` : value}</span>
      </span>
      <input
        type="range"
        className="range"
        min={spec.min}
        max={spec.max}
        step={1}
        value={value}
        style={{ background } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        // 막대를 두 번 누르면 원본 값으로 돌아간다.
        onDoubleClick={() => {
          onChange(0);
          onCommit();
        }}
      />
    </label>
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
