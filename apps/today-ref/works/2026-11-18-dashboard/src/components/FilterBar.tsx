import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import { DIMENSION_GROUPS, DIMENSIONS, type DimensionId, type Filter, type Lists, type PeriodId } from "../data";
import { formatNumber } from "../format";
import { Icon } from "../icons";
import { PeriodSelect } from "./PeriodSelect";
import { useDismiss } from "./useDismiss";

interface FilterBarProps {
  filters: Filter[];
  lists: Lists;
  period: PeriodId;
  onAdd: (filter: Filter) => void;
  onRemove: (dimension: DimensionId) => void;
  onClear: () => void;
  onPeriodChange: (period: PeriodId) => void;
}

export function FilterBar({ filters, lists, period, onAdd, onRemove, onClear, onPeriodChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu lists={lists} onAdd={onAdd} />

      <AnimatePresence initial={false}>
        {filters.map((filter) => (
          <motion.span
            key={filter.dimension}
            layout="position"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="flex h-7 max-w-[320px] items-center rounded-md border border-line bg-panel pl-2.5 text-[13px]"
          >
            <span className="shrink-0 text-muted">{DIMENSIONS[filter.dimension].label}</span>
            <span className="ml-1.5 truncate text-ink">{filter.value}</span>
            <button
              type="button"
              onClick={() => onRemove(filter.dimension)}
              aria-label={`${DIMENSIONS[filter.dimension].label} 필터 제거`}
              className="ml-1 grid h-full w-7 shrink-0 place-items-center rounded-r-md text-muted hover:bg-raised hover:text-ink"
            >
              <Icon name="close" className="size-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      {filters.length > 1 && (
        <button type="button" onClick={onClear} className="h-7 px-1.5 text-[13px] text-muted hover:text-ink">
          모두 지우기
        </button>
      )}

      <div className="ml-auto">
        <PeriodSelect value={period} onChange={onPeriodChange} />
      </div>
    </div>
  );
}

// 차원을 고른 뒤 그 차원의 값을 검색해 필터로 더한다.
function FilterMenu({ lists, onAdd }: { lists: Lists; onAdd: (filter: Filter) => void }) {
  const [open, setOpen] = useState(false);
  const [dimension, setDimension] = useState<DimensionId | null>(null);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setDimension(null);
    setQuery("");
  };
  useDismiss(rootRef, open, close);

  const rows = dimension ? lists[dimension] : [];
  const matches = rows.filter((row) => row.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-2 hover:bg-raised hover:text-ink"
      >
        <Icon name="filter" className="size-[14px] text-muted" />
        필터
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-[calc(100%+4px)] z-30 w-[260px] overflow-hidden rounded-lg border border-line bg-raised shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)]"
          >
            {dimension === null ? (
              <div className="max-h-[360px] overflow-y-auto p-1">
                {DIMENSION_GROUPS.map((group) => (
                  <div key={group.label} className="pb-1">
                    <div className="px-2.5 pb-0.5 pt-1.5 text-[12px] text-faint">{group.label}</div>
                    {group.dimensions.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDimension(id)}
                        className="flex h-[30px] w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] text-ink-2 hover:bg-white/[0.05] hover:text-ink"
                      >
                        {DIMENSIONS[id].tabLabel}
                        <Icon name="chevronRight" className="size-3 text-faint" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1 border-b border-line px-1 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDimension(null);
                      setQuery("");
                    }}
                    aria-label="차원 목록으로"
                    className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-white/[0.05] hover:text-ink"
                  >
                    <Icon name="chevronLeft" className="size-3.5" />
                  </button>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`${DIMENSIONS[dimension].tabLabel} 검색`}
                    className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
                  />
                </div>
                <ul className="max-h-[300px] overflow-y-auto p-1">
                  {matches.map((row) => (
                    <li key={row.label}>
                      <button
                        type="button"
                        onClick={() => {
                          onAdd({ dimension, value: row.label, group: row.group });
                          close();
                        }}
                        className="flex h-[30px] w-full items-center justify-between gap-3 rounded-md px-2.5 text-left text-[13px] text-ink-2 hover:bg-white/[0.05] hover:text-ink"
                      >
                        <span className="truncate">{row.label}</span>
                        <span className="tabular shrink-0 text-[12px] text-muted">{formatNumber(row.value)}</span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && <li className="px-2.5 py-2 text-[13px] text-muted">일치하는 값이 없습니다</li>}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
