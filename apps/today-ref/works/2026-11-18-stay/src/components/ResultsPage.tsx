import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { STAYS, type Stay, lowestPrice } from "../data";
import { nightsBetween } from "../dates";
import { useMediaQuery } from "../hooks";
import { won } from "../pricing";
import {
  type Filters,
  type SearchCriteria,
  type SortKey,
  EMPTY_FILTERS,
  applyFilters,
  searchStays,
  sortStays,
} from "../search";
import { FilterPanel } from "./FilterPanel";
import { CloseIcon, ListIcon, MapIcon, StarIcon } from "./icons";
import { ResultsToolbar } from "./ResultsToolbar";
import { StayCard } from "./StayCard";
import { StayMap } from "./StayMap";
import { StayPhoto } from "./StayPhoto";

export function ResultsPage({
  criteria,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  savedIds,
  onToggleSave,
  onOpenStay,
  initialScrollY,
  returnedFromId,
}: {
  criteria: SearchCriteria;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenStay: (id: string) => void;
  initialScrollY: number;
  /** 상세에서 막 돌아왔을 때 그 숙소 id. 그 카드를 잠깐 표시한다. */
  returnedFromId: string | null;
}) {
  const wideMap = useMediaQuery("(min-width: 1240px)");
  const phone = useMediaQuery("(max-width: 639px)");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [narrowView, setNarrowView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const mapAreaRef = useRef<HTMLDivElement>(null);

  const matching = searchStays(STAYS, criteria);
  const results = sortStays(applyFilters(matching, filters), sort);
  const nights = nightsBetween(criteria.range);
  const activeId = hoveredId ?? pinnedId;
  const showList = wideMap || narrowView === "list";
  const showMap = wideMap || narrowView === "map";
  const pinnedStay = results.find((stay) => stay.id === pinnedId);
  const title = criteria.query === "" ? "서울 숙소" : `${criteria.query} 숙소`;

  // 상세에서 돌아왔을 때 떠나기 전 스크롤 위치로 되돌린다.
  useLayoutEffect(() => {
    window.scrollTo(0, initialScrollY);
  }, [initialScrollY]);

  // 좁은 화면에서 지도로 바꾸면 검색창 아래 지도가 화면을 채우도록 지도 위치로 스크롤한다.
  function toggleNarrowView() {
    const next = narrowView === "list" ? "map" : "list";
    flushSync(() => setNarrowView(next));
    const mapTop = mapAreaRef.current ? mapAreaRef.current.getBoundingClientRect().top + window.scrollY : 0;
    window.scrollTo({ top: next === "map" ? mapTop : 0 });
  }

  function selectFromMap(id: string) {
    setPinnedId(id);
    if (wideMap) cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // 조건이 바뀌면 줄어든 목록의 처음부터 보여 준다.
  function changeFilters(next: Filters) {
    onFiltersChange(next);
    window.scrollTo({ top: 0 });
  }

  function changeSort(next: SortKey) {
    onSortChange(next);
    window.scrollTo({ top: 0 });
  }

  const filterPanel = <FilterPanel stays={matching} filters={filters} onChange={changeFilters} />;

  return (
    <div className="mx-auto flex max-w-[1760px] gap-6 px-4 sm:px-6">
      <aside className="hidden w-[216px] shrink-0 lg:block">
        <div className="sticky top-[calc(var(--header-h)+8px)] max-h-[calc(100dvh-var(--header-h)-8px)] overflow-y-auto pb-10 pr-1 pt-6 [scrollbar-width:thin]">
          {filterPanel}
        </div>
      </aside>

      {showList && (
        <section className="min-w-0 flex-1 pb-28 pt-6" aria-label="숙소 목록">
          <ResultsToolbar
            title={title}
            count={results.length}
            sort={sort}
            onSortChange={changeSort}
            filters={filters}
            onFiltersChange={changeFilters}
            onOpenFilters={() => setFiltersOpen(true)}
          />

          {results.length === 0 ? (
            <div className="mt-20 flex flex-col items-center text-center">
              <p className="text-[17px] font-semibold">조건에 맞는 숙소가 없습니다</p>
              <p className="mt-1 text-[15px] text-muted">필터를 줄이거나 날짜와 인원을 바꿔 보세요.</p>
              <button
                type="button"
                onClick={() => changeFilters(EMPTY_FILTERS)}
                className="mt-5 h-10 rounded-lg border border-ink px-4 text-[14px] font-semibold hover:bg-canvas"
              >
                필터 모두 지우기
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 gap-y-8">
              {results.map((stay) => (
                <StayCard
                  key={stay.id}
                  stay={stay}
                  nights={nights}
                  highlighted={stay.id === activeId}
                  pinned={stay.id === pinnedId}
                  justViewed={stay.id === returnedFromId}
                  saved={savedIds.includes(stay.id)}
                  onOpen={() => onOpenStay(stay.id)}
                  onToggleSave={() => onToggleSave(stay.id)}
                  onHoverChange={(hovering) => setHoveredId(hovering ? stay.id : null)}
                  cardRef={(element) => {
                    if (element) cardRefs.current.set(stay.id, element);
                    else cardRefs.current.delete(stay.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showMap && (
        <div ref={mapAreaRef} className={wideMap ? "w-[clamp(400px,34vw,640px)] shrink-0" : "min-w-0 flex-1"}>
          <div className="sticky top-[calc(var(--header-h)+16px)] my-4 h-[calc(100dvh-var(--header-h)-32px)] overflow-hidden rounded-xl border border-line">
            <StayMap
              stays={results}
              activeId={activeId}
              onHover={setHoveredId}
              onSelect={selectFromMap}
              initialZoom={phone ? 1 : 0}
            />
            {!wideMap && pinnedStay && (
              <MapPreview
                stay={pinnedStay}
                onOpen={() => onOpenStay(pinnedStay.id)}
                onClose={() => setPinnedId(null)}
              />
            )}
          </div>
        </div>
      )}

      {!wideMap && (
        <button
          type="button"
          onClick={toggleNarrowView}
          className="fixed bottom-6 left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white shadow-[0_6px_20px_-6px_rgb(0_0_0/0.5)] hover:scale-[1.03]"
        >
          {narrowView === "list" ? <MapIcon size={18} /> : <ListIcon size={18} />}
          {narrowView === "list" ? "지도 보기" : "목록 보기"}
        </button>
      )}

      <AnimatePresence>
        {filtersOpen && (
          <FilterDrawer count={results.length} onClose={() => setFiltersOpen(false)}>
            {filterPanel}
          </FilterDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}

function MapPreview({ stay, onOpen, onClose }: { stay: Stay; onOpen: () => void; onClose: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-20 flex overflow-hidden rounded-xl bg-white shadow-[0_8px_28px_-8px_rgb(0_0_0/0.35)]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 text-left">
        <span className="h-[104px] w-[112px] shrink-0">
          <StayPhoto tone={stay.tone} scene={stay.photos[0]} />
        </span>
        <span className="flex min-w-0 flex-col justify-center px-4">
          <span className="truncate text-[15px] font-semibold">{stay.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
            <StarIcon size={12} className="text-ink" />
            <span className="tabular text-ink">{stay.rating.toFixed(2)}</span>
            {stay.area} {stay.type}
          </span>
          <span className="tabular mt-1.5 text-[15px] font-semibold">
            {won(lowestPrice(stay))}
            <span className="font-normal text-muted"> /박</span>
          </span>
        </span>
      </button>
      <button type="button" onClick={onClose} aria-label="미리보기 닫기" className="grid w-10 shrink-0 place-items-start pt-3 text-muted">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

function FilterDrawer({ count, onClose, children }: { count: number; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="필터">
      <motion.div
        className="absolute inset-0 bg-black/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="absolute inset-y-0 left-0 flex w-[min(360px,88vw)] flex-col bg-white"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex-1 overflow-y-auto px-5 pt-4">{children}</div>
        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="tabular h-12 w-full rounded-lg bg-ink text-[15px] font-semibold text-white"
          >
            숙소 {count}개 보기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
