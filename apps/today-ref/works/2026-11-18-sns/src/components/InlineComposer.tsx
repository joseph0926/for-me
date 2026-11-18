import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type KeyboardEvent } from "react";

import { me } from "../data";
import { Avatar } from "./Avatar";

// 피드 맨 위에서 바로 쓰는 글쓰기 줄. 글자가 생기면 게시 버튼이 펼쳐진다.
export function InlineComposer({ placeholder, onSubmit }: { placeholder: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canPost = text.trim().length > 0;

  function fitHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function submit() {
    if (!canPost) return;
    onSubmit(text.trim());
    setText("");
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.blur();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex gap-3 border-b border-line px-4 pb-3 pt-2">
      <div className="pt-0.5">
        <Avatar user={me} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-[21px]">{me.handle}</p>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          aria-label="새 글"
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            fitHeight(event.target);
          }}
          onKeyDown={handleKeyDown}
          className="block w-full resize-none bg-transparent text-[15px] leading-[21px] outline-none placeholder:text-muted"
        />
        <AnimatePresence initial={false}>
          {canPost && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={submit}
                  className="hit h-9 rounded-full bg-ink px-4 text-[15px] font-semibold text-surface active:opacity-70"
                >
                  게시
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
