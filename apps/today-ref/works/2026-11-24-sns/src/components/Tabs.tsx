// 주소로 바뀌는 탭. 고른 탭 뒤 옅은 면 하나가 200ms에 미끄러져 옮겨 간다(tastepin 탭: 바탕 면, 미끄러짐).
import { motion } from "motion/react";
import { useId } from "react";

import { easeOutCubic } from "../motion";

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

export function Tabs({ items, current, fill = false, label }: { items: TabItem[]; current: string; fill?: boolean; label: string }) {
  const layoutId = useId();
  return (
    <nav aria-label={label} className={`flex gap-1 px-3 py-2 ${fill ? "" : "overflow-x-auto [scrollbar-width:none]"}`}>
      {items.map((item) => {
        const selected = item.id === current;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={`relative flex h-9 shrink-0 items-center justify-center rounded-md px-3.5 text-[15px] transition-colors duration-150 ${
              fill ? "flex-1" : ""
            } ${selected ? "font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-[var(--hover)]"
                transition={{ duration: 0.2, ease: easeOutCubic }}
              />
            )}
            <span className="relative">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
