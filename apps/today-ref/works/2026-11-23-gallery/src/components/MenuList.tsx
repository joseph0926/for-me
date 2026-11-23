// 메뉴 항목 목록. 가리킨 항목으로 옅은 면 하나가 따라 움직인다(tastepin 드롭다운 메뉴: 항목 30px, 글자 14px).
import { motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { CheckIcon } from "./Icons";

export interface MenuEntry {
  key: string;
  label: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
  onSelect: () => void;
}

export function MenuList({ entries, role = "menuitem" }: { entries: MenuEntry[]; role?: "menuitem" | "menuitemradio" | "menuitemcheckbox" }) {
  const [hovered, setHovered] = useState<string | null>(null);
  // 같은 화면에 메뉴가 둘 열려도 따라오는 면이 서로 건너가지 않게 메뉴마다 이름을 따로 둔다.
  const layoutId = useId();
  return (
    <div className="flex flex-col" onPointerLeave={() => setHovered(null)}>
      {entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          role={role}
          aria-checked={role === "menuitem" ? undefined : Boolean(entry.checked)}
          disabled={entry.disabled}
          onPointerEnter={() => setHovered(entry.key)}
          onFocus={() => setHovered(entry.key)}
          onClick={entry.onSelect}
          className={`relative flex h-[30px] w-full items-center gap-2 rounded-[4px] px-2.5 text-left text-[14px] outline-none disabled:text-[var(--faint)] ${
            entry.danger ? "text-[#d8383e] dark:text-[#ff6b70]" : ""
          }`}
        >
          {hovered === entry.key && !entry.disabled && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-[4px] bg-[var(--hover)]"
              transition={{ duration: 0.12, ease: "easeOut" }}
            />
          )}
          <span className="relative flex min-w-0 flex-1 items-center gap-2">{entry.label}</span>
          {entry.hint && <span className="relative text-[13px] text-[var(--faint)]">{entry.hint}</span>}
          {entry.checked && <CheckIcon size={15} className="relative" />}
        </button>
      ))}
    </div>
  );
}
