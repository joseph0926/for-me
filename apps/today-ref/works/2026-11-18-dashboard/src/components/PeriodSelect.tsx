import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import { PERIODS, type PeriodId } from "../data";
import { Icon } from "../icons";
import { useDismiss } from "./useDismiss";

export function PeriodSelect({ value, onChange }: { value: PeriodId; onChange: (period: PeriodId) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, open, () => setOpen(false));

  const current = PERIODS.find((p) => p.id === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] text-ink-2 hover:bg-raised hover:text-ink"
      >
        <Icon name="calendar" className="size-[14px] text-muted" />
        {current?.label}
        <Icon name="chevronDown" className="size-3 text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="기간"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+4px)] z-30 w-40 rounded-lg border border-line bg-raised p-1 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)]"
          >
            {PERIODS.map((period) => {
              const selected = period.id === value;
              return (
                <li key={period.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(period.id);
                      setOpen(false);
                    }}
                    className="flex h-[30px] w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] text-ink-2 hover:bg-white/[0.05] hover:text-ink"
                  >
                    {period.label}
                    {selected && <Icon name="check" className="size-[14px] text-ink" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
