import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";

import { AMENITIES, STAY_TYPES, type Stay } from "../data";
import {
  type FilterGroup,
  type Filters,
  EMPTY_FILTERS,
  PRICE_BANDS,
  RATING_OPTIONS,
  appliedChips,
  facetCount,
  toggle,
} from "../search";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";

// 펼침 영역은 스프링 없이 곡선으로만 열고 닫는다.
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;
const INITIALLY_OPEN: FilterGroup[] = ["price", "type", "amenity"];

/**
 * 왼쪽 필터 열. 각 항목 옆 숫자는 그 항목을 고르면 남을 숙소 수다.
 * 묶음 사이는 선 없이 여백과 굵은 묶음 제목으로만 나눈다.
 */
export function FilterPanel({
  stays,
  filters,
  onChange,
  showClearAll,
}: {
  stays: Stay[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** 목록 위 조건 칩 줄이 보이지 않는 서랍에서만 모두 지우기를 둔다. */
  showClearAll: boolean;
}) {
  const [openGroups, setOpenGroups] = useState<FilterGroup[]>(INITIALLY_OPEN);
  const hasApplied = appliedChips(filters).length > 0;

  function groupProps(group: FilterGroup) {
    return { open: openGroups.includes(group), onToggle: () => setOpenGroups((groups) => toggle(groups, group)) };
  }

  return (
    <div>
      <div className="flex h-9 items-center justify-between">
        <h2 className="text-[17px] font-semibold">필터</h2>
        {showClearAll && hasApplied && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-[14px] text-muted underline underline-offset-4 hover:text-ink"
          >
            모두 지우기
          </button>
        )}
      </div>

      <FilterSection title="1박 요금" {...groupProps("price")}>
        {PRICE_BANDS.map((band) => {
          const next = { ...filters, priceBands: toggle(filters.priceBands, band.id) };
          const checked = filters.priceBands.includes(band.id);
          return (
            <CheckRow
              key={band.id}
              label={band.label}
              checked={checked}
              count={facetCount(stays, filters, "price", { ...filters, priceBands: [band.id] })}
              onChange={() => onChange(next)}
            />
          );
        })}
      </FilterSection>

      <FilterSection title="숙소 유형" {...groupProps("type")}>
        {STAY_TYPES.map((type) => (
          <CheckRow
            key={type}
            label={type}
            checked={filters.types.includes(type)}
            count={facetCount(stays, filters, "type", { ...filters, types: [type] })}
            onChange={() => onChange({ ...filters, types: toggle(filters.types, type) })}
          />
        ))}
      </FilterSection>

      <FilterSection title="편의시설" {...groupProps("amenity")}>
        {AMENITIES.filter((amenity) => amenity.id !== "wifi").map((amenity) => (
          <CheckRow
            key={amenity.id}
            label={amenity.label}
            checked={filters.amenities.includes(amenity.id)}
            count={facetCount(stays, filters, "amenity", {
              ...filters,
              amenities: [...filters.amenities.filter((id) => id !== amenity.id), amenity.id],
            })}
            onChange={() => onChange({ ...filters, amenities: toggle(filters.amenities, amenity.id) })}
          />
        ))}
      </FilterSection>

      <FilterSection title="평점" {...groupProps("rating")}>
        {RATING_OPTIONS.map((option) => (
          <label key={option.value} className="flex h-9 cursor-pointer items-center gap-3 text-[15px]">
            <input
              type="radio"
              name="min-rating"
              checked={filters.minRating === option.value}
              onChange={() => onChange({ ...filters, minRating: option.value })}
              className="peer sr-only"
            />
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-line-strong peer-checked:border-accent peer-checked:[&>span]:block peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
              <span className="hidden h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            <span className="flex-1">{option.label}</span>
            <span className="tabular text-[13px] text-subtle">
              {facetCount(stays, filters, "rating", { ...filters, minRating: option.value })}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="취소 정책" {...groupProps("cancel")}>
        <CheckRow
          label="무료 취소 가능"
          checked={filters.freeCancelOnly}
          count={facetCount(stays, filters, "cancel", { ...filters, freeCancelOnly: true })}
          onChange={() => onChange({ ...filters, freeCancelOnly: !filters.freeCancelOnly })}
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mt-3 first-of-type:mt-2">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between text-left text-[15px] font-semibold"
        >
          {title}
          {open ? <MinusIcon size={18} className="text-muted" /> : <PlusIcon size={18} className="text-muted" />}
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_CUBIC }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CheckRow({
  label,
  checked,
  count,
  onChange,
}: {
  label: string;
  checked: boolean;
  count: number;
  onChange: () => void;
}) {
  const unavailable = count === 0 && !checked;
  return (
    <label className={`flex h-9 items-center gap-3 text-[15px] ${unavailable ? "text-subtle" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} disabled={unavailable} onChange={onChange} className="peer sr-only" />
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${
          checked ? "border-accent bg-accent text-white" : "border-line-strong bg-white"
        }`}
      >
        {checked && <CheckIcon size={14} strokeWidth={2.4} />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="tabular text-[13px] text-subtle">{count}</span>
    </label>
  );
}
