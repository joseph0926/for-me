import { useState } from "react";
import { toolNames } from "./document";
import type { Mark, PenStyle } from "./document";

function PixelSize({ label, value, max, onApply }: {
  label: string; value: number; max: number; onApply: (size: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  function commit() {
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 1 || next > max) {
      setDraft(String(value));
      return;
    }
    if (next !== value) onApply(next);
  }
  return (
    <label>{label} (px)
      <input type="number" min="1" max={max} step="1" value={draft}
        onChange={event => setDraft(event.target.value)} onBlur={commit}
        onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    </label>
  );
}

export function PenSettings({ style, disabled, onChange }: {
  style: PenStyle; disabled: boolean; onChange: (style: PenStyle) => void;
}) {
  return (
    <fieldset className="mark-settings" disabled={disabled} aria-label="펜 설정">
      <strong>펜</strong>
      <label>선 색
        <input type="color" value={style.color} onChange={event => onChange({ ...style, color: event.target.value })} />
      </label>
      <PixelSize label="선 굵기" max={256} key={style.strokeWidth} value={style.strokeWidth}
        onApply={strokeWidth => onChange({ ...style, strokeWidth })} />
    </fieldset>
  );
}

type Props = {
  mark: Exclude<Mark, { tool: "pen" }>;
  disabled: boolean;
  onColor: (color: string) => void;
  onSize: (size: number) => void;
  onBold: () => void;
  onText: () => void;
};

export function MarkSettings({ mark, disabled, onColor, onSize, onBold, onText }: Props) {
  const colorLabel = { memo: "글자색", cover: "채우기 색", highlight: "테두리 색" }[mark.tool];
  return (
    <fieldset className="mark-settings" disabled={disabled} aria-label={toolNames[mark.tool] + " 설정"}>
      <strong>{toolNames[mark.tool]}</strong>
      <label>{colorLabel}
        <input type="color" value={mark.color} onChange={event => onColor(event.target.value)} />
      </label>
      {mark.tool === "memo" && <>
        <PixelSize label="크기" max={4096} key={mark.fontSize} value={mark.fontSize} onApply={onSize} />
        <button type="button" aria-pressed={mark.bold} onClick={onBold}>굵게</button>
        <button type="button" onClick={onText}>글 수정</button>
      </>}
    </fieldset>
  );
}
