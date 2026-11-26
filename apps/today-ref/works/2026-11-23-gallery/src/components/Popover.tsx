// 단추 아래에 붙는 작은 떠 있는 창. 바깥을 누르거나 Esc를 누르면 닫힌다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  label: ReactNode;
  active?: boolean;
  align?: "left" | "right";
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
}

export function Popover({ label, active, align = "left", ariaLabel, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        // 거르기가 걸린 단추는 굵기와 본문색으로, 열린 단추만 면을 깐다. 걸린 상태와 올린 상태가 같은 회색 면이면
        // 마우스를 올린 단추가 거르기가 걸린 것처럼 보였다. 걸린 값(색 견본, 태그 수, 별 수)은 단추 글자가 보여 준다.
        className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors ${
          open ? "bg-[var(--hover)] text-[var(--ink)]" : active ? "font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            // 버튼 쪽 모서리를 기준으로 0.96배에서 커지며 열리고 같은 길로 닫힌다(140ms).
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.215, 0.61, 0.355, 1] }}
            className={`absolute top-full z-40 mt-1.5 rounded-md border border-[var(--line)] bg-[var(--raised)] p-1 shadow-[var(--shadow)] ${
              align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
            }`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
