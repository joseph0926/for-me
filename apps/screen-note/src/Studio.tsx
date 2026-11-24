import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import logo from "./assets/screen-note-logo.png";
import { toolNames } from "./document";
import type { Tool } from "./document";

export function StudioHeader({ name, onOpen, onUndo, onCopy, onSave }: {
  name?: string;
  onOpen: () => void;
  onUndo?: () => void;
  onCopy?: () => void;
  onSave?: () => void;
}) {
  return (
    <header className="studio-header">
      <div className="brand"><img src={logo} width="34" height="34" alt="" />Screen Note</div>
      {name && <span className="document-name" title={name}>{name}</span>}
      <div className="header-actions">
        {name && <button className="undo" title="되돌리기" aria-label="되돌리기" disabled={!onUndo} onClick={onUndo}><Icon name="undo" /></button>}
        <button onClick={onOpen} aria-label={name ? "다른 이미지 열기" : "파일 열기"}><Icon name="open" />열기</button>
        {name && <button onClick={onCopy} disabled={!onCopy}><Icon name="copy" />이미지 복사</button>}
        {name && <button className="primary" onClick={onSave} disabled={!onSave}><Icon name="save" />복사본 저장</button>}
      </div>
    </header>
  );
}

const toolOrder: Tool[] = ["select", "crop", "pen", "memo", "cover", "highlight"];
const shortcuts: Record<Tool, string> = { select: "V", crop: "C", pen: "P", memo: "T", cover: "R", highlight: "H" };

export function ToolRail({ active, disabled, onSelect }: {
  active?: Tool;
  disabled?: boolean;
  onSelect?: (tool: Tool) => void;
}) {
  const [hint, setHint] = useState<Tool | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const warm = useRef(false);
  function dismiss() {
    window.clearTimeout(timer.current);
    warm.current = false;
    setHint(null);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled || !onSelect) return;
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 ||
          event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable], .replacement")) return;
      if (document.querySelector(".replacement")) return;
      const tool = toolOrder.find(tool => shortcuts[tool] === event.key.toUpperCase());
      if (tool) {
        event.preventDefault();
        onSelect?.(tool);
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [disabled, onSelect]);
  return (
    <div className="tool-rail" role="group" aria-label="편집 도구" onPointerLeave={dismiss}>
      {toolOrder.map(tool => (
        <button key={tool} type="button" disabled={disabled} aria-pressed={active === tool}
          aria-label={toolNames[tool]} aria-keyshortcuts={shortcuts[tool]}
          onPointerEnter={event => {
            if (disabled || event.pointerType !== "mouse") return;
            window.clearTimeout(timer.current);
            if (warm.current) setHint(tool);
            else timer.current = window.setTimeout(() => { warm.current = true; setHint(tool); }, 400);
          }}
          onPointerLeave={() => { window.clearTimeout(timer.current); setHint(null); }}
          onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHint(tool); }}
          onBlur={dismiss} onKeyDown={event => { if (event.key === "Escape") dismiss(); }}
          onClick={() => onSelect?.(tool)}>
          <Icon name={tool} /><span className="tool-name">{toolNames[tool]}</span>
          {hint === tool && !disabled && <span className="tool-tip" role="tooltip">
            {toolNames[tool]} <kbd>{shortcuts[tool]}</kbd>
          </span>}
        </button>
      ))}
    </div>
  );
}
