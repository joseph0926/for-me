// 더보기 메뉴. 버튼 쪽 모서리에서 0.96배로 펼쳐지고, 가리킨 항목을 옅은 면이 따라간다(tastepin 드롭다운 메뉴).
// 글 행은 접히는 애니메이션 때문에 넘치는 부분을 자르므로, 메뉴는 body에 띄우고 버튼 위치에 맞춘다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { easeOutCubic } from "../motion";
import { MoreIcon } from "./Icons";

export interface MenuEntry {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

export function MoreMenu({ entries, label }: { entries: MenuEntry[]; label: string }) {
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const open = anchor !== null;
  const setOpen = (next: boolean) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    setAnchor(next && rect ? { top: rect.bottom + 4, right: window.innerWidth - rect.right } : null);
  };
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const highlightId = useId();

  // 바깥을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    // 버튼이 움직이면 메뉴 자리가 어긋나므로 스크롤과 창 크기 변화에서 닫는다.
    const onMove = () => setAnchor(null);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setActive(0);
          setOpen(!open);
        }}
        className="grid size-9 place-items-center rounded-md text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--ink)]"
      >
        <MoreIcon size={18} />
      </button>
      {createPortal(
        <AnimatePresence>
        {anchor && (
          <motion.div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: easeOutCubic }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
              else if (event.key === "ArrowDown") setActive((index) => (index + 1) % entries.length);
              else if (event.key === "ArrowUp") setActive((index) => (index - 1 + entries.length) % entries.length);
              else if (event.key === "Enter") {
                entries[active]?.onSelect();
                close();
              } else return;
              event.preventDefault();
            }}
            style={{ top: anchor.top, right: anchor.right }}
            className="fixed z-40 min-w-48 origin-top-right rounded-md bg-[var(--raised)] p-1 shadow-[var(--shadow)] outline-none"
          >
            {entries.map((entry, index) => (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onPointerEnter={() => setActive(index)}
                onClick={() => {
                  entry.onSelect();
                  close();
                }}
                className={`relative flex h-[30px] w-full items-center gap-2.5 rounded-[4px] px-2.5 text-left text-[14px] ${
                  entry.danger ? "text-[var(--like)]" : "text-[var(--ink)]"
                }`}
              >
                {index === active && (
                  <motion.span layoutId={highlightId} className="absolute inset-0 rounded-[4px] bg-[var(--hover)]" transition={{ duration: 0.12, ease: "easeOut" }} />
                )}
                <span className="relative text-[var(--muted)]">{entry.icon}</span>
                <span className="relative">{entry.label}</span>
              </button>
            ))}
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
