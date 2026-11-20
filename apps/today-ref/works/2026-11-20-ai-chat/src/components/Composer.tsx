// 입력창: 위는 글줄, 아래는 도구(+)와 보내기. 도구를 고르면 위에 "도구 ×" 칩이 붙고 안내 문구가 바뀐다.
// 답을 쓰는 동안 보내기 자리는 중지 버튼이 된다.
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { type Tool, tools } from "../answers";
import { Icon, type IconName } from "./Icon";

const toolIcons: Record<Tool, IconName> = { web: "globe", think: "bulb" };

export function Composer({
  tool,
  generating,
  busyElsewhere,
  onToolChange,
  onSend,
  onStop,
}: {
  tool: Tool | null;
  generating: boolean;
  busyElsewhere: boolean;
  onToolChange: (tool: Tool | null) => void;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const canSend = draft.trim() !== "" && !generating && !busyElsewhere;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(draft.trim());
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="relative shrink-0 px-3 pt-1 pb-3">
      <AnimatePresence>
        {menuOpen && (
          <>
            <button type="button" aria-label="도구 메뉴 닫기" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
            <motion.ul
              role="menu"
              className="absolute bottom-full left-3 z-20 mb-2 w-[240px] rounded-2xl border border-line bg-surface p-1.5 shadow-[0_10px_30px_rgb(0_0_0/14%)]"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.14 }}
            >
              {(Object.keys(tools) as Tool[]).map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={tool === id}
                    onClick={() => {
                      onToolChange(tool === id ? null : id);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-raised"
                  >
                    <Icon name={toolIcons[id]} size={20} className="mt-0.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{tools[id].label}</span>
                      <span className="block text-[12px] text-muted">{tools[id].description}</span>
                    </span>
                    {tool === id && <Icon name="check" size={18} className="mt-0.5 shrink-0 text-accent" />}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>

      {busyElsewhere && (
        <p className="mb-1.5 flex items-center gap-2 px-2 text-[12px] text-muted" role="status">
          <span className="spinner" />
          다른 대화의 답을 마저 쓰고 있어요. 끝나면 보낼 수 있어요.
        </p>
      )}
      <div className="rounded-[22px] border border-line bg-surface px-3 pt-2.5 pb-2 shadow-[0_2px_10px_rgb(0_0_0/5%)]">
        {tool && (
          <div className="mb-1.5">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-soft pr-1 pl-2.5 text-[13px] font-medium text-accent">
              <Icon name={toolIcons[tool]} size={15} />
              {tools[tool].label}
              <button
                type="button"
                onClick={() => onToolChange(null)}
                aria-label={`${tools[tool].label} 끄기`}
                className="grid size-5 place-items-center rounded-full"
              >
                <Icon name="close" size={13} />
              </button>
            </span>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="질문 입력"
          placeholder={tool ? tools[tool].placeholder : "무엇이든 물어보세요"}
          className="no-scrollbar block max-h-32 min-h-6 w-full resize-none bg-transparent px-1 text-[15px] leading-6 outline-none placeholder:text-faint [field-sizing:content]"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="도구"
            aria-expanded={menuOpen}
            className={`grid size-9 place-items-center rounded-full border border-line transition ${menuOpen ? "rotate-45 bg-raised" : ""}`}
          >
            <Icon name="plus" size={18} />
          </button>
          {generating ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="답변 멈추기"
              className="grid size-9 place-items-center rounded-full bg-ink text-surface"
            >
              <span className="size-3 rounded-[3px] bg-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="보내기"
              className="grid size-9 place-items-center rounded-full bg-ink text-surface transition disabled:bg-raised-2 disabled:text-faint"
            >
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
