import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import { me } from "../data";
import { Avatar } from "./Avatar";

export function ComposeSheet({
  isOpen,
  onClose,
  onPublish,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (text: string) => void;
}) {
  return <AnimatePresence>{isOpen && <SheetContent key="compose" onClose={onClose} onPublish={onPublish} />}</AnimatePresence>;
}

function isOpenedDefinition(definition: unknown): boolean {
  return typeof definition === "object" && definition !== null && "y" in definition && definition.y === 0;
}

function SheetContent({ onClose, onPublish }: { onClose: () => void; onPublish: (text: string) => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canPost = text.trim().length > 0;

  return (
    <motion.div className="absolute inset-0 z-40">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="새로운 글"
        className="absolute inset-x-0 bottom-0 top-[calc(var(--safe-top)+10px)] flex flex-col rounded-t-[14px] bg-surface"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
        onAnimationComplete={(definition) => {
          // 올라오는 중에 포커스를 주면 브라우저가 틀 전체를 스크롤하므로 다 올라온 뒤에 준다.
          if (isOpenedDefinition(definition)) textareaRef.current?.focus({ preventScroll: true });
        }}
      >
        <header className="relative flex h-14 shrink-0 items-center px-4">
          <button type="button" onClick={onClose} className="hit relative z-10 text-[17px] active:opacity-50">
            취소
          </button>
          <h2 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold">새로운 글</h2>
        </header>
        <div className="scroll-y min-h-0 flex-1 border-t border-line px-4 pt-3">
          <div className="flex gap-3">
            <div className="pt-0.5">
              <Avatar user={me} size={36} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-[21px]">{me.handle}</p>
              <textarea
                ref={textareaRef}
                value={text}
                aria-label="새 글"
                placeholder="새로운 소식이 있나요?"
                onChange={(event) => setText(event.target.value)}
                className="block min-h-[120px] w-full resize-none bg-transparent text-[15px] leading-[21px] outline-none placeholder:text-muted"
              />
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-end px-4 pb-[calc(var(--safe-bottom)+10px)] pt-2">
          <button
            type="button"
            disabled={!canPost}
            onClick={() => onPublish(text.trim())}
            className="hit h-9 rounded-full bg-ink px-4 text-[15px] font-semibold text-surface active:opacity-70 disabled:opacity-25"
          >
            게시
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}
