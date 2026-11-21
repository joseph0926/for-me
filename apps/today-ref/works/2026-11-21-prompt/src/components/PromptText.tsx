// 프롬프트 원문을 줄 단위로 그린다. ## 제목, 목록, <태그> 줄을 구분하고 {{변수}}는 색으로 칠한다.
import type { ReactNode } from "react";

function withVariables(line: string, values: Record<string, string>): ReactNode[] {
  return line.split(/(\{\{[^{}]+\}\})/g).map((part, index) => {
    const match = part.match(/^\{\{([^{}]+)\}\}$/);
    if (!match) return part;
    const filled = values[match[1]]?.trim();
    return (
      <mark key={index} className={filled ? "variable variable-filled" : "variable"} title={filled ? `{{${match[1]}}}` : undefined}>
        {filled || part}
      </mark>
    );
  });
}

export function PromptText({ text, values = {}, cursor = false }: { text: string; values?: Record<string, string>; cursor?: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="prompt-text">
      {lines.map((line, index) => {
        const isLast = index === lines.length - 1;
        const caret = cursor && isLast ? <span className="caret" aria-hidden="true" /> : null;
        if (line.startsWith("## ")) {
          return (
            <p key={index} className="prompt-heading">
              {line.slice(3)}
              {caret}
            </p>
          );
        }
        if (line.trim() === "") return <p key={index} className="prompt-gap" aria-hidden="true" />;
        const kind = /^\s*<\/?[^>]+>\s*$/.test(line) ? "prompt-tag" : /^(- |\d+\. )/.test(line) ? "prompt-item" : "prompt-line";
        return (
          <p key={index} className={kind}>
            {withVariables(line, values)}
            {caret}
          </p>
        );
      })}
    </div>
  );
}
