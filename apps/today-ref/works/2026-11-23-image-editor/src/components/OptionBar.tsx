// 위 옵션 막대. 고른 도구의 설정만 보여 준다(tastepin 편집기 도구 이름).
import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

import type { EditState, Mark } from "../editor/state";
import { cropRatios, markColors, toolList, type MarkStyle, type Tool } from "../tools";
import { FlipHIcon, FlipVIcon, ResetIcon, RotateLeftIcon, RotateRightIcon, TrashIcon } from "./Icons";

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
  selectedMark: Mark | null;
  onMarkChange: (patch: Partial<{ color: string; width: number; size: number }>, key?: string) => void;
  onMarkDelete: () => void;
}

export function OptionBar(props: OptionBarProps) {
  const { tool, edit, markStyle, onMarkStyle } = props;
  const title = toolList.find((item) => item.id === tool)?.label ?? "";

  let content: ReactNode = null;
  if (tool === "crop") {
    const geometryChanged = edit.rotation !== 0 || edit.flipH || edit.flipV || edit.straighten !== 0 || edit.crop !== null;
    content = (
      <>
        <Underline label="비율" options={cropRatios.map((r) => ({ key: String(r.value), label: r.label }))} value={String(props.cropRatio)} onChange={(key) => props.onCropRatio(key === "null" ? null : Number(key))} />
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
  } else if (tool === "pen" || tool === "text" || tool === "shape" || (tool === "select" && props.selectedMark)) {
    // 고른 표시가 있으면 그 표시를, 없으면 다음에 그릴 표시의 설정을 바꾼다.
    const mark = tool === "select" ? props.selectedMark : null;
    const color = mark?.color ?? markStyle.color;
    const isText = mark ? mark.kind === "text" : tool === "text";
    const sizeValue = mark ? (mark.kind === "text" ? mark.size : mark.width) : isText ? markStyle.textSize : markStyle.width;
    content = (
      <>
        {tool === "shape" && (
          <>
            <Underline
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
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="색">
          {markColors.map((hex) => (
            <motion.button
              key={hex}
              type="button"
              role="radio"
              aria-checked={color === hex}
              aria-label={`색 ${hex}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => (mark ? props.onMarkChange({ color: hex }) : onMarkStyle({ ...markStyle, color: hex }))}
              className={`size-6 rounded-full ring-1 ring-black/20 ${color === hex ? "outline-2 outline-offset-2 outline-[var(--ink)]" : ""}`}
              style={{ background: hex }}
            />
          ))}
        </div>
        <Divider />
        <Range
          label={isText ? "크기" : "굵기"}
          value={sizeValue}
          min={isText ? 12 : 2}
          max={isText ? 200 : 60}
          unit="px"
          onChange={(value) =>
            mark
              ? props.onMarkChange(isText ? { size: value } : { width: value }, `mark-size-${mark.id}`)
              : onMarkStyle(isText ? { ...markStyle, textSize: value } : { ...markStyle, width: value })
          }
          onCommit={props.onFilterCommit}
        />
        {mark && (
          <>
            <Divider />
            <TextButton onClick={props.onMarkDelete} icon={<TrashIcon size={16} />}>
              지우기
            </TextButton>
          </>
        )}
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

function IconButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--hover)] ${pressed ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
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

// 밑줄이 미끄러지는 단일 선택(tastepin 세그먼트 컨트롤).
function Underline({ label, options, value, onChange }: { label: string; options: { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const on = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.key)}
            className={`relative h-8 shrink-0 px-0.5 ${on ? "font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            {option.label}
            {on && <motion.span layoutId={`underline-${label}`} className="absolute right-0 bottom-0.5 left-0 h-0.5 rounded-full bg-[var(--ink)]" transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }} />}
          </button>
        );
      })}
    </div>
  );
}

function Range({ label, value, min, max, unit, disabled, onChange, onCommit }: { label: string; value: number; min: number; max: number; unit: string; disabled?: boolean; onChange: (value: number) => void; onCommit: () => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className={`flex shrink-0 items-center gap-2.5 ${disabled ? "opacity-40" : ""}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <input
        type="range"
        className="range w-32"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <span className="w-12 text-[13px] tabular-nums">
        {value}
        {unit}
      </span>
    </label>
  );
}
