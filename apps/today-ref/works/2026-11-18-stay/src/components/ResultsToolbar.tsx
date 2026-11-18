import { type Filters, type SortKey, SORT_OPTIONS, EMPTY_FILTERS, appliedChips } from "../search";
import { ChevronDown, CloseIcon, SlidersIcon } from "./icons";

/** 목록 위의 결과 수, 정렬, 필터 열기 버튼과 적용한 조건 칩 */
export function ResultsToolbar({
  title,
  count,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  onOpenFilters,
}: {
  title: string;
  count: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onOpenFilters: () => void;
}) {
  const chips = appliedChips(filters);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="tabular text-[20px] font-semibold tracking-[-0.01em]">
          {title} <span className="text-muted">{count}개</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[14px] font-medium hover:border-ink lg:hidden"
          >
            <SlidersIcon size={16} />
            필터
            {chips.length > 0 && (
              <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[12px] text-white">
                {chips.length}
              </span>
            )}
          </button>
          <label className="relative">
            <span className="sr-only">정렬</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortKey)}
              className="h-9 appearance-none rounded-lg border border-line-strong bg-white pl-3 pr-8 text-[14px] font-medium hover:border-ink"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFiltersChange(chip.remove(filters))}
              aria-label={`${chip.label} 조건 빼기`}
              className="flex h-8 items-center gap-1 rounded-full border border-line-strong bg-white pl-3 pr-2 text-[14px] hover:border-ink"
            >
              {chip.label}
              <CloseIcon size={14} className="text-muted" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onFiltersChange(EMPTY_FILTERS)}
            className="h-8 px-2 text-[14px] text-muted underline underline-offset-4 hover:text-ink"
          >
            모두 지우기
          </button>
        </div>
      )}
    </div>
  );
}
