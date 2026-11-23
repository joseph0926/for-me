// 왼쪽 세로 도구 열(tastepin 편집기: 아이콘만 두고, 400ms 올리거나 초점이 오면 오른쪽에 이름과 단축키 말풍선).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { toolList, type Tool } from "../tools";
import { CropIcon, FilterIcon, PenIcon, PointerIcon, ShapeIcon, SlidersIcon, TextIcon } from "./Icons";

const icons: Record<Tool, ReactNode> = {
  select: <PointerIcon size={20} />,
  crop: <CropIcon size={20} />,
  adjust: <SlidersIcon size={20} />,
  filter: <FilterIcon size={20} />,
  pen: <PenIcon size={20} />,
  text: <TextIcon size={20} />,
  shape: <ShapeIcon size={20} />,
};

const hoverDelayMs = 400;
// 말풍선이 한 번 뜬 뒤 이만큼 안에 옆 아이콘으로 옮기면 기다리지 않는다.
const warmMs = 300;

export function ToolRail({ tool, onTool }: { tool: Tool; onTool: (tool: Tool) => void }) {
  const [tip, setTip] = useState<Tool | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const warmUntil = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (id: Tool, immediate: boolean) => {
    window.clearTimeout(timer.current);
    if (immediate || Date.now() < warmUntil.current) setTip(id);
    else timer.current = window.setTimeout(() => setTip(id), hoverDelayMs);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (tip) warmUntil.current = Date.now() + warmMs;
    setTip(null);
  };

  return (
    <nav
      aria-label="도구"
      className="flex shrink-0 gap-1 bg-[var(--panel)] p-1.5 max-md:order-last max-md:justify-around md:w-14 md:flex-col md:items-center md:py-3"
    >
      {toolList.map(({ id, label, key }) => {
        const active = tool === id;
        return (
          <div key={id} className="relative">
            <motion.button
              type="button"
              aria-label={`${label} (${key})`}
              aria-pressed={active}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.12 }}
              onClick={() => onTool(id)}
              onPointerEnter={(event) => event.pointerType !== "touch" && show(id, false)}
              onPointerLeave={hide}
              onFocus={(event) => event.currentTarget.matches(":focus-visible") && show(id, true)}
              onBlur={hide}
              className={`relative grid size-10 place-items-center rounded-md ${active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              {active && (
                <motion.span layoutId="tool-active" className="absolute inset-0 rounded-md bg-[var(--accent-soft)]" transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }} />
              )}
              <span className="relative">{icons[id]}</span>
            </motion.button>
            <AnimatePresence>
              {tip === id && (
                <motion.span
                  role="tooltip"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 flex -translate-y-1/2 items-center gap-2 rounded-md bg-[var(--raised)] px-2.5 py-1.5 text-[13px] whitespace-nowrap text-[var(--ink)] shadow-[var(--shadow)] max-md:hidden"
                >
                  {label}
                  <kbd className="font-sans text-[var(--faint)]">{key}</kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
