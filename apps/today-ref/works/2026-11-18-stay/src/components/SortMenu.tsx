import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";

import { useDismiss } from "../hooks";
import { type SortKey, SORT_OPTIONS } from "../search";
import { CheckIcon, ChevronDown } from "./icons";

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

/**
 * 정렬 기준 버튼과 메뉴. 버튼에는 지금 기준만 쓰고, 메뉴는 버튼 오른쪽 위 모서리에서 펼친다.
 * 열린 동안 메뉴 자체가 포커스를 갖고, 위아래 화살표로 가리킨 항목을 aria-activedescendant로 알린다.
 */
export function SortMenu({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const selectedIndex = SORT_OPTIONS.findIndex((option) => option.value === value);
  const selected = SORT_OPTIONS[selectedIndex] ?? SORT_OPTIONS[0];

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);
  useDismiss(rootRef, open, close);

  // 닫히는 애니메이션 중에 다시 열면 같은 요소가 되살아나므로, 마운트가 아니라 열릴 때마다 포커스를 옮긴다.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  function openMenu() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function choose(next: SortKey) {
    close();
    triggerRef.current?.focus();
    if (next !== value) onChange(next);
  }

  function handleMenuKey(event: KeyboardEvent) {
    const count = SORT_OPTIONS.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + count) % count);
    } else if ((event.key === "Enter" || event.key === " ") && activeIndex >= 0) {
      event.preventDefault();
      choose(SORT_OPTIONS[activeIndex].value);
    } else if (event.key === "Escape" || event.key === "Tab") {
      close();
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`flex h-9 items-center gap-1.5 rounded-lg border bg-white pl-3 pr-2.5 text-[14px] font-medium ${
          open ? "border-ink" : "border-line-strong hover:border-ink"
        }`}
      >
        <span className="sr-only">정렬 기준: </span>
        {selected.label}
        <ChevronDown size={16} className={`text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="정렬 기준"
            tabIndex={-1}
            aria-activedescendant={activeIndex >= 0 ? `${menuId}-${activeIndex}` : undefined}
            onKeyDown={handleMenuKey}
            onPointerLeave={() => setActiveIndex(-1)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: EASE_OUT_CUBIC }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-40 mt-1 min-w-[150px] rounded-lg border border-line bg-white p-1 shadow-[0_12px_40px_-12px_rgb(20_20_30/0.25)] outline-none"
          >
            {SORT_OPTIONS.map((option, index) => (
              <div
                key={option.value}
                id={`${menuId}-${index}`}
                role="menuitemradio"
                aria-checked={option.value === value}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(option.value)}
                className="relative flex h-[30px] cursor-pointer items-center gap-3 rounded-md px-2 text-[14px]"
              >
                {index === activeIndex && (
                  <motion.span
                    layoutId={`${menuId}-highlight`}
                    transition={{ duration: 0.12, ease: EASE_OUT_CUBIC }}
                    className="absolute inset-0 rounded-md bg-canvas"
                  />
                )}
                <span className="relative flex-1 whitespace-nowrap">{option.label}</span>
                <span className="relative grid w-4 place-items-center">
                  {option.value === value && <CheckIcon size={16} />}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
