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

// tastepin 막대 배경 목록 카드 값: 40px 행의 이름 아래 3px 막대, 처음 6행, 카드 아래 "n개 모두 보기" 글자 버튼 줄.
const COLLAPSED_ROWS = 6;
const ROW_HEIGHT = 40;
const ROW_GAP = 2;

// 탭으로 차원을 바꾸고, 이름 아래 가는 막대 길이로 값의 크기를 보여 주는 목록 카드.
export function ListCard({ dimensions, lists, onSelect }: ListCardProps) {
  const [dimension, setDimension] = useState(dimensions[0]);
  const [expanded, setExpanded] = useState(false);

  const rows = lists[dimension];
  const max = rows[0]?.value ?? 0;
  // 한 행만 더 남을 때는 펼치기 줄 대신 그 행을 바로 보여 준다.
  const canExpand = rows.length > COLLAPSED_ROWS + 1;
  const visibleRows = expanded || !canExpand ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    // 두 열일 때 접힌 카드끼리 높이를 맞춘다. 354는 머리 44px, 7행(40px + 간격 2px)과 위아래 여백 16px, 테두리 2px로
    // 펼치기 없이 7행을 다 보여 주는 카드의 높이다. 6행과 아래 버튼 줄(40px)인 카드는 이보다 2px 낮다.
    <section className="flex flex-col rounded-md border border-line bg-panel md:min-h-[354px]">
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
                className={`relative shrink-0 text-[13px] ${selected ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {DIMENSIONS[id].tabLabel}
                {selected && <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-[12px] text-faint">방문자</span>
      </header>

      <div className="flex-1 p-2">
        {rows.length === 0 ? (
          <div className="grid h-[200px] place-items-center text-[14px] text-muted">조건에 맞는 방문이 없습니다</div>
        ) : (
          <ul className="flex flex-col" style={{ gap: ROW_GAP }}>
            {visibleRows.map((row, index) => (
              // 기준을 바꿔도 같은 자리의 막대가 새 길이로 이어서 바뀌도록 자리 번호를 키로 쓴다.
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onSelect({ dimension, value: row.label, group: row.group })}
                  className="group relative flex w-full items-start justify-between gap-4 rounded-md px-2.5 pt-[9px] text-left hover:bg-white/[0.03]"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="relative truncate text-[14px] leading-5 text-ink-2 group-hover:text-ink">{row.label}</span>
                  <span className="relative flex shrink-0 items-center gap-2 leading-5">
                    <Icon
                      name="filter"
                      className="size-3 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    />
                    <span className="tabular text-[14px] text-ink">{formatNumber(row.value)}</span>
                  </span>
                  {/* 막대는 행 좌우 여백 안의 길을 기준으로 길이를 정한다. */}
                  <span aria-hidden="true" className="absolute inset-x-2.5 bottom-[6px] h-[3px]">
                    <motion.span
                      className="block h-full rounded-[2px] bg-accent/55"
                      initial={false}
                      animate={{ width: `${Math.max((row.value / max) * 100, 1)}%` }}
                      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="h-10 rounded-b-[5px] border-t border-line px-[18px] text-left text-[13px] text-ink-2 hover:bg-raised hover:text-ink"
        >
          {expanded ? "접기" : `${rows.length}개 모두 보기`}
        </button>
      )}
    </section>
  );
}
