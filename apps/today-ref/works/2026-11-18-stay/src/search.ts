import type { DateRange } from "./dates";
import { type AmenityId, type Stay, type StayType, amenityLabel, lowestPrice, maxCapacity } from "./data";

export interface Guests {
  adults: number;
  children: number;
}

export interface SearchCriteria {
  /** 빈 문자열이면 서울 전체 */
  query: string;
  range: DateRange | null;
  guests: Guests;
}

export function totalGuests(guests: Guests) {
  return guests.adults + guests.children;
}

export function guestsLabel(guests: Guests) {
  return guests.children > 0 ? `성인 ${guests.adults}명, 아동 ${guests.children}명` : `성인 ${guests.adults}명`;
}

export function normalizeQuery(text: string) {
  const trimmed = text.trim();
  return trimmed === "서울" || trimmed === "서울 전체" ? "" : trimmed;
}

export function placeLabel(query: string) {
  return query === "" ? "서울 전체" : query;
}

function matchesCriteria(stay: Stay, criteria: SearchCriteria) {
  if (maxCapacity(stay) < totalGuests(criteria.guests)) return false;
  if (criteria.query === "") return true;
  const haystack = `${stay.area} ${stay.name} ${stay.type}`;
  return haystack.includes(criteria.query);
}

export function searchStays(stays: Stay[], criteria: SearchCriteria) {
  return stays.filter((stay) => matchesCriteria(stay, criteria));
}

// 필터

export type PriceBandId = "under100" | "100to150" | "150to200" | "over200";

export const PRICE_BANDS: { id: PriceBandId; label: string; min: number; max: number }[] = [
  { id: "under100", label: "10만원 미만", min: 0, max: 100000 },
  { id: "100to150", label: "10만~15만원", min: 100000, max: 150000 },
  { id: "150to200", label: "15만~20만원", min: 150000, max: 200000 },
  { id: "over200", label: "20만원 이상", min: 200000, max: Number.POSITIVE_INFINITY },
];

export type MinRating = 0 | 4.5 | 4.8;
export const RATING_OPTIONS: { value: MinRating; label: string }[] = [
  { value: 0, label: "전체" },
  { value: 4.5, label: "4.5 이상" },
  { value: 4.8, label: "4.8 이상" },
];

export interface Filters {
  priceBands: PriceBandId[];
  types: StayType[];
  amenities: AmenityId[];
  minRating: MinRating;
  freeCancelOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  priceBands: [],
  types: [],
  amenities: [],
  minRating: 0,
  freeCancelOnly: false,
};

export type FilterGroup = "price" | "type" | "amenity" | "rating" | "cancel";

const GROUP_MATCHERS: Record<FilterGroup, (stay: Stay, filters: Filters) => boolean> = {
  price: (stay, filters) => {
    if (filters.priceBands.length === 0) return true;
    const price = lowestPrice(stay);
    return PRICE_BANDS.some((band) => filters.priceBands.includes(band.id) && price >= band.min && price < band.max);
  },
  type: (stay, filters) => filters.types.length === 0 || filters.types.includes(stay.type),
  // 편의시설은 고른 것을 모두 갖춘 숙소만 남긴다.
  amenity: (stay, filters) => filters.amenities.every((amenity) => stay.amenities.includes(amenity)),
  rating: (stay, filters) => stay.rating >= filters.minRating,
  cancel: (stay, filters) => !filters.freeCancelOnly || stay.cancellation.kind === "free",
};

const GROUPS = Object.keys(GROUP_MATCHERS) as FilterGroup[];

export function applyFilters(stays: Stay[], filters: Filters, exceptGroup?: FilterGroup) {
  return stays.filter((stay) =>
    GROUPS.every((group) => group === exceptGroup || GROUP_MATCHERS[group](stay, filters)),
  );
}

/** 해당 묶음을 이 값으로 바꿨을 때 남을 숙소 수. 다른 묶음의 조건은 그대로 둔다. */
export function facetCount(stays: Stay[], filters: Filters, group: FilterGroup, next: Filters) {
  return applyFilters(stays, filters, group).filter((stay) => GROUP_MATCHERS[group](stay, next)).length;
}

export function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export interface AppliedChip {
  key: string;
  label: string;
  remove: (filters: Filters) => Filters;
}

export function appliedChips(filters: Filters): AppliedChip[] {
  const chips: AppliedChip[] = [];
  for (const band of PRICE_BANDS) {
    if (!filters.priceBands.includes(band.id)) continue;
    chips.push({
      key: `price-${band.id}`,
      label: band.label,
      remove: (current) => ({ ...current, priceBands: current.priceBands.filter((id) => id !== band.id) }),
    });
  }
  for (const type of filters.types) {
    chips.push({
      key: `type-${type}`,
      label: type,
      remove: (current) => ({ ...current, types: current.types.filter((item) => item !== type) }),
    });
  }
  for (const amenity of filters.amenities) {
    chips.push({
      key: `amenity-${amenity}`,
      label: amenityLabel(amenity),
      remove: (current) => ({ ...current, amenities: current.amenities.filter((item) => item !== amenity) }),
    });
  }
  if (filters.minRating > 0) {
    chips.push({ key: "rating", label: `평점 ${filters.minRating} 이상`, remove: (current) => ({ ...current, minRating: 0 }) });
  }
  if (filters.freeCancelOnly) {
    chips.push({ key: "cancel", label: "무료 취소", remove: (current) => ({ ...current, freeCancelOnly: false }) });
  }
  return chips;
}

// 정렬

export type SortKey = "recommended" | "priceAsc" | "ratingDesc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "priceAsc", label: "낮은 가격순" },
  { value: "ratingDesc", label: "평점 높은순" },
];

export function sortStays(stays: Stay[], sort: SortKey) {
  switch (sort) {
    case "recommended":
      return stays;
    case "priceAsc":
      return [...stays].sort((a, b) => lowestPrice(a) - lowestPrice(b));
    case "ratingDesc":
      return [...stays].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }
}
