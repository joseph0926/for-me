// 위 옵션 막대. 고른 도구의 설정만 보여 준다(tastepin 편집기 도구 이름).
// 고른 표시의 색과 굵기는 여기가 아니라 표시 위 떠 있는 막대에서 고친다(tastepin 표시 고르고 고치기).
import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

import type { EditState } from "../editor/state";
import { cropRatios, markColors, toolList, type MarkStyle, type Tool } from "../tools";
import { FlipHIcon, FlipVIcon, ResetIcon, RotateLeftIcon, RotateRightIcon } from "./Icons";

interface OptionBarProps {
  tool: Tool;
  edit: EditState;
  markStyle: MarkStyle;
  onMarkStyle: (next: MarkStyle) => void;
  cropRatio: number | null;
  onCropRatio: (ratio: number | null) => void;
  onRotate: (direction: 1 | -1) => void;
  onFlip: (axis: "h" | "v") => void;
  onResetGeometry: () => void;
  onFilterAmount: (amount: number) => void;
  onFilterCommit: () => void;
}

export function OptionBar(props: OptionBarProps) {
  const { tool, edit, markStyle, onMarkStyle } = props;
  const title = toolList.find((item) => item.id === tool)?.label ?? "";

  let content: ReactNode = null;
  if (tool === "crop") {
    const geometryChanged = edit.rotation !== 0 || edit.flipH || edit.flipV || edit.straighten !== 0 || edit.crop !== null;
    content = (
      <>
        <Chips label="비율" options={cropRatios.map((r) => ({ key: String(r.value), label: r.label }))} value={String(props.cropRatio)} onChange={(key) => props.onCropRatio(key === "null" ? null : Number(key))} />
        <Divider />
        <IconButton label="왼쪽으로 90도" onClick={() => props.onRotate(-1)}>
          <RotateLeftIcon size={18} />
        </IconButton>
        <IconButton label="오른쪽으로 90도" onClick={() => props.onRotate(1)}>
          <RotateRightIcon size={18} />
        </IconButton>
        <IconButton label="좌우 뒤집기" pressed={edit.flipH} onClick={() => props.onFlip("h")}>
          <FlipHIcon size={18} />
        </IconButton>
        <IconButton label="상하 뒤집기" pressed={edit.flipV} onClick={() => props.onFlip("v")}>
          <FlipVIcon size={18} />
        </IconButton>
        <Divider />
        <TextButton disabled={!geometryChanged} onClick={props.onResetGeometry} icon={<ResetIcon size={16} />}>
          자르기 초기화
        </TextButton>
      </>
    );
  } else if (tool === "filter") {
    content = (
      <Range
        label="강도"
        value={edit.filter.amount}
        min={0}
        max={100}
        unit="%"
        disabled={edit.filter.id === "none"}
        onChange={props.onFilterAmount}
        onCommit={props.onFilterCommit}
      />
    );
  } else if (tool === "pen" || tool === "text" || tool === "shape") {
    // 다음에 그릴 표시의 설정.
    const isText = tool === "text";
    content = (
      <>
        {tool === "shape" && (
          <>
            {/* 자르기 비율과 같은 칩 모양으로 맞춘다. 한 막대 자리에서 단일 선택이 두 모양으로 보이지 않게 한다. */}
            <Chips
              label="모양"
              options={[
                { key: "rect", label: "사각형" },
                { key: "arrow", label: "화살표" },
              ]}
              value={markStyle.shape}
              onChange={(key) => onMarkStyle({ ...markStyle, shape: key as MarkStyle["shape"] })}
            />
            <Divider />
          </>
        )}
        <Swatches value={markStyle.color} onChange={(color) => onMarkStyle({ ...markStyle, color })} />
        <Divider />
        <Range
          label={isText ? "크기" : "굵기"}
          value={isText ? markStyle.textSize : markStyle.width}
          min={isText ? 12 : 2}
          max={isText ? 200 : 60}
          unit="px"
          onChange={(value) => onMarkStyle(isText ? { ...markStyle, textSize: value } : { ...markStyle, width: value })}
          onCommit={props.onFilterCommit}
        />
      </>
    );
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto bg-[var(--surface)] px-4 whitespace-nowrap thin-scroll">
      <span className="shrink-0 font-[650]">{title}</span>
      {content && <Divider />}
      {content}
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px shrink-0 bg-[var(--line)]" />;
}

// 마우스를 올리면 글자색만 진해진다. 바탕을 칠하는 것은 눌린 상태뿐이라, 올린 것이 켜진 것처럼 보이지 않는다.
export function IconButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md ${pressed ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
    >
      {children}
    </motion.button>
  );
}

function TextButton({ onClick, disabled, icon, children }: { onClick: () => void; disabled?: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)] disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {icon}
      {children}
    </button>
  );
}

// 칩 한 줄의 단일 선택(tastepin 자르기와 수평: 옵션 막대의 비율 칩, 고른 칩을 채운다).
// 고른 칩의 면은 도구 열과 머리줄의 눌린 단추와 같은 면을 쓴다.
function Chips({ label, options, value, onChange }: { label: string; options: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const on = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.key)}
            className={`h-8 shrink-0 rounded-md px-2.5 ${on ? "bg-[var(--accent-soft)] font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// small은 표시 위 떠 있는 막대용이다. 휴대폰 너비에서도 막대가 작업 화면 안에 들어가게 견본을 조금 줄인다.
export function Swatches({ value, small, onChange }: { value: string; small?: boolean; onChange: (hex: string) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5" role="radiogroup" aria-label="색">
      {markColors.map(({ hex, name }) => (
        <motion.button
          key={hex}
          type="button"
          role="radio"
          aria-checked={value === hex}
          aria-label={name}
          title={name}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(hex)}
          className={`${small ? "size-5" : "size-6"} rounded-full ring-1 ring-black/20 ${value === hex ? "outline-2 outline-offset-2 outline-[var(--ink)]" : ""}`}
          style={{ background: hex }}
        />
      ))}
    </div>
  );
}

export function Range({ label, value, min, max, unit, disabled, compact, onChange, onCommit }: { label: string; value: number; min: number; max: number; unit: string; disabled?: boolean; compact?: boolean; onChange: (value: number) => void; onCommit: () => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className={`flex shrink-0 items-center gap-2.5 ${disabled ? "opacity-40" : ""}`}>
      <span className={`text-[var(--muted)] ${compact ? "max-sm:sr-only" : ""}`}>{label}</span>
      <input
        type="range"
        className={`range ${compact ? "w-16 sm:w-20" : "w-32"}`}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <span className={`text-[13px] tabular-nums ${compact ? "w-10" : "w-12"}`}>
        {value}
        {unit}
      </span>
    </label>
  );
}
