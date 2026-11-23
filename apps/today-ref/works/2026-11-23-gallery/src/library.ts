// 보관함 항목과 그 변경, 보는 위치(폴더 등)와 거르기, 정렬, 날짜 묶음 계산.
export type MediaKind = "image" | "video" | "gif";

export interface MediaSeed {
  id: string;
  kind: MediaKind;
  src: string;
  // 동영상 격자와 필름 띠에 쓰는 정지 화면. 이미지와 GIF는 src를 그대로 쓴다.
  poster?: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
  // 찍은 날. 분까지의 지역 시각 문자열(YYYY-MM-DDTHH:mm)이다.
  takenAt: string;
  folder: string;
  tags: string[];
  rating: number;
  // 초. 동영상만 있다.
  duration?: number;
  credit?: { author: string; url: string };
}

export const colorTags = ["red", "orange", "yellow", "green", "blue", "purple", "gray"] as const;
export type ColorTag = (typeof colorTags)[number];

export interface MediaItem extends MediaSeed {
  favorite: boolean;
  colorTag: ColorTag | null;
  note: string;
  trashed: boolean;
  // 보관함에 들어온 순서. 최근 추가 목록이 이 값으로 고른다.
  addedOrder: number;
  // 사용자가 가져온 파일은 object URL이라 보관함에서 영구 삭제할 때 해제한다.
  imported: boolean;
}

export const folders = ["여행", "도시", "일상", "흑백", "영상", "움짤", "가져온 항목"] as const;

export type Place =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "recent" }
  | { type: "trash" }
  | { type: "folder"; name: string };

export interface Filters {
  // null이면 모든 형식을 보여 준다.
  kind: MediaKind | null;
  color: string | null;
  tags: string[];
  minRating: number;
  query: string;
}

export const emptyFilters: Filters = { kind: null, color: null, tags: [], minRating: 0, query: "" };

// 기준마다 방향을 하나로 정해 둔다(tastepin 정렬): 찍은 날과 크기, 별점은 큰 쪽이 위, 이름은 가나다순.
export const sortKeys = ["taken", "name", "bytes", "rating"] as const;
export type SortKey = (typeof sortKeys)[number];

export const sortLabels: Record<SortKey, string> = {
  taken: "찍은 날순",
  name: "이름순",
  bytes: "큰 파일순",
  rating: "별점순",
};

export const kindLabels: Record<MediaKind, string> = { image: "이미지", video: "동영상", gif: "GIF" };

export const recentCount = 12;

export function createLibrary(seeds: MediaSeed[]): MediaItem[] {
  return seeds.map((seed, index) => ({
    ...seed,
    favorite: index % 9 === 2,
    colorTag: null,
    note: "",
    trashed: false,
    // 원본 목록은 최신 항목이 앞이므로 뒤에서부터 차례를 매긴다.
    addedOrder: seeds.length - index,
    imported: false,
  }));
}

export type LibraryAction =
  | { type: "patch"; ids: string[]; patch: Partial<Pick<MediaItem, "favorite" | "colorTag" | "rating" | "trashed" | "folder">> }
  | { type: "toggleFavorite"; ids: string[] }
  | { type: "rename"; id: string; name: string }
  | { type: "note"; id: string; note: string }
  | { type: "addTag"; ids: string[]; tag: string }
  | { type: "removeTag"; id: string; tag: string }
  | { type: "deleteForever"; ids: string[] }
  | { type: "import"; items: MediaItem[] };

export function libraryReducer(items: MediaItem[], action: LibraryAction): MediaItem[] {
  switch (action.type) {
    case "patch": {
      const ids = new Set(action.ids);
      return items.map((item) => (ids.has(item.id) ? { ...item, ...action.patch } : item));
    }
    case "toggleFavorite": {
      const ids = new Set(action.ids);
      // 여러 장 중 하나라도 즐겨찾기가 아니면 모두 즐겨찾기로, 모두 즐겨찾기면 모두 뺀다.
      const targets = items.filter((item) => ids.has(item.id));
      const next = targets.some((item) => !item.favorite);
      return items.map((item) => (ids.has(item.id) ? { ...item, favorite: next } : item));
    }
    case "rename":
      return items.map((item) => (item.id === action.id ? { ...item, name: action.name } : item));
    case "note":
      return items.map((item) => (item.id === action.id ? { ...item, note: action.note } : item));
    case "addTag": {
      const ids = new Set(action.ids);
      return items.map((item) =>
        ids.has(item.id) && !item.tags.includes(action.tag) ? { ...item, tags: [...item.tags, action.tag] } : item,
      );
    }
    case "removeTag":
      return items.map((item) =>
        item.id === action.id ? { ...item, tags: item.tags.filter((tag) => tag !== action.tag) } : item,
      );
    case "deleteForever": {
      const ids = new Set(action.ids);
      return items.filter((item) => !ids.has(item.id));
    }
    case "import":
      return [...action.items, ...items];
  }
}

export function placeLabel(place: Place): string {
  switch (place.type) {
    case "all":
      return "모든 항목";
    case "favorites":
      return "즐겨찾기";
    case "recent":
      return "최근 추가";
    case "trash":
      return "휴지통";
    case "folder":
      return place.name;
  }
}

export function samePlace(a: Place, b: Place): boolean {
  return a.type === b.type && (a.type !== "folder" || a.name === (b as { name: string }).name);
}

export function itemsInPlace(items: MediaItem[], place: Place): MediaItem[] {
  if (place.type === "trash") return items.filter((item) => item.trashed);
  const alive = items.filter((item) => !item.trashed);
  switch (place.type) {
    case "all":
      return alive;
    case "favorites":
      return alive.filter((item) => item.favorite);
    case "recent":
      return [...alive].sort((a, b) => b.addedOrder - a.addedOrder).slice(0, recentCount);
    case "folder":
      return alive.filter((item) => item.folder === place.name);
  }
}

export function applyFilters(
  items: MediaItem[],
  filters: Filters,
  matchesColor: (item: MediaItem, color: string) => boolean,
): MediaItem[] {
  const query = filters.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.kind && item.kind !== filters.kind) return false;
    if (filters.minRating > 0 && item.rating < filters.minRating) return false;
    if (filters.tags.length > 0 && !filters.tags.every((tag) => item.tags.includes(tag))) return false;
    if (filters.color && !matchesColor(item, filters.color)) return false;
    if (query && !`${item.name} ${item.tags.join(" ")} ${item.note}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function sortItems(items: MediaItem[], key: SortKey): MediaItem[] {
  const sorted = [...items];
  switch (key) {
    case "taken":
      return sorted.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    case "bytes":
      return sorted.sort((a, b) => b.bytes - a.bytes);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.takenAt.localeCompare(a.takenAt));
  }
}

export interface Group {
  key: string;
  label: string;
  year: string | null;
  items: MediaItem[];
}

// 찍은 날 순서일 때만 달마다 묶는다. 다른 정렬은 묶음 하나로 둔다.
export function groupItems(items: MediaItem[], key: SortKey): Group[] {
  if (key !== "taken") return [{ key: "all", label: "", year: null, items }];
  const groups: Group[] = [];
  for (const item of items) {
    const month = item.takenAt.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === month) last.items.push(item);
    else groups.push({ key: month, label: `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`, year: month.slice(0, 4), items: [item] });
  }
  return groups;
}

export function allTags(items: MediaItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "ko"));
}

export function thumbSrc(item: MediaItem): string {
  return item.poster ?? item.src;
}

export function countByKind(items: MediaItem[]): Record<MediaKind, number> {
  const counts: Record<MediaKind, number> = { image: 0, video: 0, gif: 0 };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}
