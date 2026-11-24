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

export function ToolRail({ active, disabled, onSelect }: {
  active?: Tool;
  disabled?: boolean;
  onSelect?: (tool: Tool) => void;
}) {
  return (
    <div className="tool-rail" role="group" aria-label="편집 도구">
      {toolOrder.map(tool => (
        <button key={tool} type="button" disabled={disabled} aria-pressed={active === tool}
          onClick={() => onSelect?.(tool)}>
          <Icon name={tool} /><span>{toolNames[tool]}</span>
        </button>
      ))}
    </div>
  );
}
