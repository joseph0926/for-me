// 답변 본문의 작은 마크다운: ## 제목, - 목록, 1. 번호 목록, --- 구분선, **굵게**, [구절](#n) 출처.
// 쓰는 중인 답은 앞부분만 받으므로, 아직 닫히지 않은 표시는 닫힐 때까지 보여 주지 않는다.
import type { ReactNode } from "react";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "rule" }
  | { kind: "paragraph"; text: string };

export function AnswerText({
  text,
  writing,
  onCitation,
}: {
  text: string;
  writing: boolean;
  onCitation: (sourceId: number) => void;
}) {
  const blocks = parseBlocks(writing ? hideUnclosedMarks(text) : text);
  return (
    <div className="answer space-y-3 text-[15px] leading-[1.7]">
      {blocks.map((block, index) => {
        const isLast = index === blocks.length - 1;
        const caret = writing && isLast ? <span className="caret" aria-hidden="true" /> : null;
        switch (block.kind) {
          case "heading":
            return (
              <h3 key={index} className="pt-2 text-[17px] font-bold">
                {inline(block.text, onCitation)}
                {caret}
              </h3>
            );
          case "rule":
            return <hr key={index} className="border-line" />;
          case "bullets":
          case "numbers": {
            const List = block.kind === "bullets" ? "ul" : "ol";
            return (
              <List key={index} className={`space-y-1 pl-5 ${block.kind === "bullets" ? "list-disc" : "list-decimal"}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-0.5 marker:text-muted">
                    {inline(item, onCitation)}
                    {itemIndex === block.items.length - 1 && caret}
                  </li>
                ))}
              </List>
            );
          }
          case "paragraph":
            return (
              <p key={index}>
                {inline(block.text, onCitation)}
                {caret}
              </p>
            );
        }
      })}
      {writing && blocks.length === 0 && <span className="caret" aria-hidden="true" />}
    </div>
  );
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const last = blocks[blocks.length - 1];
    if (trimmed === "") continue;
    if (trimmed === "---") blocks.push({ kind: "rule" });
    else if (trimmed.startsWith("## ")) blocks.push({ kind: "heading", text: trimmed.slice(3) });
    else if (trimmed.startsWith("- ")) {
      if (last?.kind === "bullets") last.items.push(trimmed.slice(2));
      else blocks.push({ kind: "bullets", items: [trimmed.slice(2)] });
    } else if (/^\d+\. /.test(trimmed)) {
      const item = trimmed.replace(/^\d+\. /, "");
      if (last?.kind === "numbers") last.items.push(item);
      else blocks.push({ kind: "numbers", items: [item] });
    } else blocks.push({ kind: "paragraph", text: trimmed });
  }
  return blocks;
}

// "**굵" 처럼 반만 온 표시나 "[구절](#" 처럼 덜 온 출처는 잘라 두었다가 닫히면 한꺼번에 보여 준다.
function hideUnclosedMarks(text: string): string {
  let result = text;
  const openLink = result.lastIndexOf("[");
  if (openLink !== -1 && !/\]\(#\d+\)/.test(result.slice(openLink))) result = result.slice(0, openLink);
  if ((result.match(/\*\*/g) ?? []).length % 2 === 1) result = result.slice(0, result.lastIndexOf("**"));
  // 줄 맨 앞의 "#", "-", 숫자만 온 상태는 아직 어떤 블록인지 모르므로 숨긴다.
  return result.replace(/\n(#{1,2}|-|\d+\.?)$/, "\n");
}

function inline(text: string, onCitation: (sourceId: number) => void): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(#(\d+)\)/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    if (match[1]) {
      parts.push(
        <strong key={index} className="font-semibold">
          {match[1]}
        </strong>,
      );
    } else {
      const sourceId = Number(match[3]);
      parts.push(
        <span key={index}>
          <span className="text-accent">{match[2]}</span>
          <button
            type="button"
            onClick={() => onCitation(sourceId)}
            aria-label={`출처 ${sourceId} 보기`}
            className="tabular mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded-full bg-accent-soft px-1 align-middle text-[11px] font-semibold text-accent"
          >
            {sourceId}
          </button>
        </span>,
      );
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
