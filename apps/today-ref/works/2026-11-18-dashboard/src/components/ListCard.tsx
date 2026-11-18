import { motion } from "motion/react";
import { useState } from "react";

import { DIMENSIONS, type DimensionId, type Filter, type Lists } from "../data";
import { formatNumber } from "../format";
import { Icon } from "../icons";

interface ListCardProps {
  dimensions: DimensionId[];
  lists: Lists;
  onSelect: (filter: Filter) => void;
}

const COLLAPSED_ROWS = 8;
const ROW_HEIGHT = 32;
const ROW_GAP = 2;

// 탭으로 차원을 바꾸고, 행 뒤 막대 길이로 값의 크기를 보여 주는 목록 카드.
export function ListCard({ dimensions, lists, onSelect }: ListCardProps) {
  const [dimension, setDimension] = useState(dimensions[0]);
  const [expanded, setExpanded] = useState(false);

  const rows = lists[dimension];
  const max = rows[0]?.value ?? 0;
  const canExpand = rows.length > COLLAPSED_ROWS;
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const fadeLast = canExpand && !expanded;

  return (
    <section className="flex flex-col rounded-xl border border-line bg-panel">
      <header className="flex h-11 items-center justify-between gap-3 border-b border-line px-4">
        <div role="tablist" aria-label="목록 기준" className="flex h-full min-w-0 items-stretch gap-4 overflow-x-auto">
          {dimensions.map((id) => {
            const selected = id === dimension;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setDimension(id);
                  setExpanded(false);
                }}
                className={`relative shrink-0 text-[13px] ${selected ? "text-ink" : "text-muted hover:text-ink-2"}`}
              >
                {DIMENSIONS[id].tabLabel}
                {selected && <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-[12px] text-faint">방문자</span>
      </header>

      {/* 두 열일 때만 옆 카드와 높이를 맞춘다. 값 288은 8행(32px + 간격 2px)과 위아래 여백 16px이다. */}
      <div className="relative px-2 py-2 md:min-h-[288px]">
        {rows.length === 0 ? (
          <div className="grid h-[200px] place-items-center text-[13px] text-muted">조건에 맞는 방문이 없습니다</div>
        ) : (
          <ul className="flex flex-col" style={{ gap: ROW_GAP }}>
            {visibleRows.map((row, index) => {
              const faded = fadeLast && index === visibleRows.length - 1;
              return (
                <li key={row.label} className={faded ? "opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent)]" : ""}>
                  <button
                    type="button"
                    onClick={() => onSelect({ dimension, value: row.label, group: row.group })}
                    className="group relative flex w-full items-center justify-between gap-4 rounded-md px-2.5 text-left"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-md bg-white/[0.055] group-hover:bg-white/[0.09]"
                      initial={false}
                      animate={{ width: `${Math.max((row.value / max) * 100, 0.8)}%` }}
                      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                    <span className="relative truncate text-[13px] text-ink-2 group-hover:text-ink">{row.label}</span>
                    <span className="relative flex shrink-0 items-center gap-2">
                      <Icon
                        name="filter"
                        className="size-3 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                      />
                      <span className="tabular text-[13px] text-ink">{formatNumber(row.value)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {canExpand && (
          <div className={expanded ? "flex justify-center pt-2" : "absolute inset-x-0 bottom-2 flex justify-center"}>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel px-3 text-[12px] text-ink-2 hover:bg-raised hover:text-ink"
            >
              {expanded ? "접기" : "모두 보기"}
              <Icon name={expanded ? "collapse" : "expand"} className="size-3 text-muted" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
