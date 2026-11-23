// 격자 위의 거르기 줄(r3): 형식, 색, 태그, 별점과 정렬, 썸네일 크기.
import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { kindLabels, sortKeys, sortLabels, type Filters, type MediaItem, type MediaKind, type SortKey } from "../library";
import { swatches } from "../palette";
import { ChevronDown, CloseIcon, StarIcon } from "./Icons";
import { MenuList } from "./MenuList";
import { Popover } from "./Popover";

interface FilterBarProps {
  filters: Filters;
  onFilters: (next: Filters) => void;
  // 태그 옆 건수를 세는 범위. 지금 보고 있는 곳의 항목이다.
  placeItems: MediaItem[];
  tags: string[];
  sort: SortKey;
  onSort: (next: SortKey) => void;
  rowHeight: number;
  onRowHeight: (next: number) => void;
}

const kinds: (MediaKind | null)[] = [null, "image", "video", "gif"];
export const rowHeightRange = { min: 110, max: 320 };

export function FilterBar({ filters, onFilters, placeItems, tags, sort, onSort, rowHeight, onRowHeight }: FilterBarProps) {
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const activeCount = (filters.kind ? 1 : 0) + (filters.color ? 1 : 0) + filters.tags.length + (filters.minRating > 0 ? 1 : 0);
  const fill = ((rowHeight - rowHeightRange.min) / (rowHeightRange.max - rowHeightRange.min)) * 100;
  // 지금 고른 태그에 더했을 때 남는 항목 수. 0이 되는 태그는 흐리게 하고 고를 수 없게 한다.
  const tagCount = (tag: string) =>
    placeItems.filter((item) => [...filters.tags, tag].every((wanted) => item.tags.includes(wanted))).length;

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-3 pt-1 pb-2 sm:px-5">
      <div className="mr-2 flex items-center gap-3" role="radiogroup" aria-label="형식">
        {kinds.map((kind) => {
          const on = filters.kind === kind;
          return (
            <button
              key={kind ?? "all"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ kind })}
              className={`relative h-8 px-0.5 ${on ? "font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              {kind ? kindLabels[kind] : "전체"}
              {on && (
                <motion.span
                  layoutId="kind-underline"
                  className="absolute right-0 bottom-0.5 left-0 h-0.5 rounded-full bg-[var(--ink)]"
                  transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      <Popover
        active={filters.color !== null}
        ariaLabel="색으로 거르기"
        label={
          <>
            {filters.color ? (
              <span className="size-3.5 rounded-full ring-1 ring-black/15" style={{ background: filters.color }} />
            ) : (
              <span className="size-3.5 rounded-full bg-[conic-gradient(#d9463b,#f2c94c,#7fb069,#4aa3c7,#8b5cc4,#d9463b)]" />
            )}
            색
            <ChevronDown size={14} />
          </>
        }
      >
        {(close) => (
          <div className="grid w-[188px] grid-cols-6 gap-2 p-2">
            {swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`색 ${hex}`}
                aria-pressed={filters.color === hex}
                onClick={() => {
                  set({ color: filters.color === hex ? null : hex });
                  close();
                }}
                className={`size-6 rounded-full ring-1 ring-black/15 ${filters.color === hex ? "outline-2 outline-offset-2 outline-[var(--ink)]" : ""}`}
                style={{ background: hex }}
              />
            ))}
          </div>
        )}
      </Popover>

      <Popover
        active={filters.tags.length > 0}
        label={
          <>
            태그{filters.tags.length > 0 && <span className="tabular-nums">{filters.tags.length}</span>}
            <ChevronDown size={14} />
          </>
        }
      >
        {() => (
          <div className="max-h-80 w-48 overflow-y-auto thin-scroll">
            <MenuList
              role="menuitemcheckbox"
              entries={tags.map((tag) => {
                const on = filters.tags.includes(tag);
                const count = tagCount(tag);
                return {
                  key: tag,
                  checked: on,
                  disabled: !on && count === 0,
                  label: (
                    <>
                      <span className="flex-1">{tag}</span>
                      <span className="text-[13px] tabular-nums text-[var(--faint)]">{count}</span>
                    </>
                  ),
                  onSelect: () => set({ tags: on ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag] }),
                };
              })}
            />
          </div>
        )}
      </Popover>

      <Popover
        active={filters.minRating > 0}
        label={
          <>
            {filters.minRating > 0 ? `별 ${filters.minRating}개 이상` : "별점"}
            <ChevronDown size={14} />
          </>
        }
      >
        {(close) => (
          <div className="w-40">
            <MenuList
              role="menuitemradio"
              entries={[0, 1, 2, 3, 4, 5].map((value) => ({
                key: String(value),
                checked: filters.minRating === value,
                label:
                  value === 0 ? (
                    "모든 별점"
                  ) : (
                    <span className="flex text-[#d99a26]" aria-label={`별 ${value}개 이상`}>
                      {Array.from({ length: value }, (_, i) => (
                        <StarIcon key={i} size={14} filled />
                      ))}
                    </span>
                  ),
                onSelect: () => {
                  set({ minRating: value });
                  close();
                },
              }))}
            />
          </div>
        )}
      </Popover>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onFilters({ ...filters, kind: null, color: null, tags: [], minRating: 0 })}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        >
          <CloseIcon size={14} />
          모두 지우기
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <Popover
          align="right"
          label={
            <>
              {sortLabels[sort]}
              <ChevronDown size={14} />
            </>
          }
        >
          {(close) => (
            <div className="w-36">
              <MenuList
                role="menuitemradio"
                entries={sortKeys.map((key) => ({
                  key,
                  checked: sort === key,
                  label: sortLabels[key],
                  onSelect: () => {
                    onSort(key);
                    close();
                  },
                }))}
              />
            </div>
          )}
        </Popover>
        <label className="hidden items-center gap-2 text-[var(--muted)] sm:flex">
          <span className="sr-only">썸네일 크기</span>
          <span className="size-2.5 rounded-[2px] border border-current" />
          <input
            type="range"
            className="range w-24"
            min={rowHeightRange.min}
            max={rowHeightRange.max}
            step={10}
            value={rowHeight}
            style={{ "--fill": `${fill}%` } as CSSProperties}
            onChange={(event) => onRowHeight(Number(event.target.value))}
          />
          <span className="size-3.5 rounded-[3px] border border-current" />
        </label>
      </div>
    </div>
  );
}
