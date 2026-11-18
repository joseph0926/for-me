import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { SortMode } from "../content";
import { CheckIcon, ChevronDownIcon } from "./Icons";

const SORT_MODES: SortMode[] = ["popular", "recent"];

export function SortMenu({
  value,
  labels,
  onChange,
}: {
  value: SortMode;
  labels: Record<SortMode, string>;
  onChange: (mode: SortMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 메뉴 밖을 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="hit flex h-8 items-center gap-1 text-[15px] font-semibold active:opacity-50"
      >
        {labels[value]}
        <ChevronDownIcon size={15} strokeWidth={2.2} className="text-muted" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-[14px] border border-line bg-elevated py-1 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.25)]"
          >
            {SORT_MODES.map((mode) => (
              <li key={mode}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={mode === value}
                  onClick={() => {
                    onChange(mode);
                    setIsOpen(false);
                  }}
                  className="flex h-11 w-full items-center justify-between px-4 text-[15px] active:bg-fill"
                >
                  {labels[mode]}
                  {mode === value && <CheckIcon size={18} strokeWidth={2.2} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
