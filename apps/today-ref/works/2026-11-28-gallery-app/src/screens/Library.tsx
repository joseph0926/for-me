// 보관함. 연, 월, 일, 전체 네 단위로 같은 사진을 다르게 묶는다(r1). 일과 전체 위에는 추억 줄을 둔다(r2).
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { Grid } from "../components/Grid";
import { ScreenHeader } from "../components/ScreenHeader";
import { Tile } from "../components/Tile";
import { itemById, memories, type MediaItem } from "../data";
import { countLabel, dayKey, dayLabel, monthKey, monthLabel, yearKey } from "../format";
import { useGallery } from "../gallery";
import { quick, thumb } from "../motion";
import { useUi } from "../ui";

type Unit = "year" | "month" | "day" | "all";

const units: { id: Unit; label: string }[] = [
  { id: "year", label: "연" },
  { id: "month", label: "월" },
  { id: "day", label: "일" },
  { id: "all", label: "전체" },
];

const scope = "library";

interface Group {
  key: string;
  items: MediaItem[];
}

function groupBy(items: MediaItem[], keyOf: (iso: string) => string): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const key = keyOf(item.takenAt);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

function counts(items: MediaItem[]) {
  const videos = items.filter((item) => item.kind === "video").length;
  return countLabel(items.length - videos, videos);
}

// 월과 연 카드의 대표 사진. 즐겨찾기한 사진이 있으면 그것을, 없으면 가장 최근 사진을 쓴다.
function coverOf(items: MediaItem[], isFavorite: (id: string) => boolean) {
  return items.find((item) => item.kind === "photo" && isFavorite(item.id)) ?? items.find((item) => item.kind === "photo") ?? items[0];
}

function uniqueAreas(items: MediaItem[]) {
  return [...new Set(items.map((item) => item.area))].slice(0, 3).join(", ");
}

export function Library() {
  const gallery = useGallery();
  const ui = useUi();
  const [unit, setUnit] = useState<Unit>("day");
  const scroller = useRef<HTMLDivElement>(null);
  // 단위를 바꾼 뒤 보여 줄 묶음. 연 카드를 누르면 그해의 첫 달로, 월 카드를 누르면 그달의 첫 날로 간다.
  const pendingScroll = useRef<string | null>(null);

  const items = gallery.visible;
  const list = items.map((item) => item.id);
  const selecting = ui.selection?.scope === scope;

  useLayoutEffect(() => {
    const target = pendingScroll.current;
    pendingScroll.current = null;
    const root = scroller.current;
    if (!root) return;
    if (target === null) {
      root.scrollTop = 0;
      return;
    }
    const element = root.querySelector<HTMLElement>(`[data-group="${target}"]`);
    // 머리줄 높이만큼 덜 내려 묶음 제목이 가려지지 않게 한다
    root.scrollTop = element ? element.offsetTop - 64 : 0;
  }, [unit]);

  function switchTo(next: Unit, groupKey: string | null = null) {
    pendingScroll.current = groupKey;
    setUnit(next);
  }

  return (
    <div className="relative h-full">
      <div ref={scroller} className="scroll-area h-full pb-28">
        <ScreenHeader title="보관함" subtitle={counts(items)} scope={scope} canSelect={items.length > 0 && unit !== "year" && unit !== "month"} />
        {items.length === 0 ? (
          <EmptyState icon="library" text="사진을 찍으면 여기에 날짜별로 모입니다" />
        ) : (
          <>
            {(unit === "day" || unit === "all") && !selecting && <MemoryRow />}
            {unit === "day" && <DayView items={items} list={list} />}
            {unit === "all" && <Grid items={items} scope={scope} list={list} />}
            {unit === "month" && (
              <CardList
                groups={groupBy(items, monthKey)}
                title={(group) => monthLabel(group.items[0].takenAt)}
                onOpen={(group) => switchTo("day", dayKey(group.items[0].takenAt))}
              />
            )}
            {unit === "year" && (
              <CardList
                groups={groupBy(items, yearKey)}
                title={(group) => `${group.key}년`}
                large
                onOpen={(group) => switchTo("month", monthKey(group.items[0].takenAt))}
              />
            )}
          </>
        )}
      </div>
      {/* 첫 화면에서는 단위 전환을 바로 보이고, 선택을 시작하고 끝낼 때만 나가고 들어온다 */}
      <AnimatePresence initial={false}>
        {!selecting && items.length > 0 && (
          <motion.div
            className="absolute inset-x-0 bottom-3 z-10 flex justify-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={quick}
          >
            <div role="tablist" aria-label="묶는 단위" className="flex rounded-work bg-raised/90 p-1 backdrop-blur-md" style={{ boxShadow: "var(--shadow)" }}>
              {units.map((option) => {
                const active = unit === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`relative h-8 min-w-[52px] px-3 text-[14px] font-semibold transition-colors duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] ${active ? "text-accent-ink" : "text-muted"}`}
                    onClick={() => switchTo(option.id)}
                  >
                    {/* 고른 칸 표시는 한 노드로 옆 칸까지 미끄러진다 */}
                    {active && <motion.span layoutId="unit-thumb" className="absolute inset-0 rounded-[4px] bg-accent" transition={thumb} />}
                    <span className="relative">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemoryRow() {
  const ui = useUi();
  const gallery = useGallery();
  const shown = memories.filter((memory) => memory.items.some(gallery.isVisible));
  if (shown.length === 0) return null;
  return (
    <section aria-label="추억" className="scroll-area mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
      {shown.map((memory) => {
        const cover = itemById.get(gallery.isVisible(memory.cover) ? memory.cover : memory.items.find(gallery.isVisible)!)!;
        return (
          <button
            key={memory.id}
            type="button"
            className="relative h-[152px] w-[110px] shrink-0 overflow-hidden rounded-work bg-sunken text-left"
            onClick={() => ui.openMemory(memory.id)}
          >
            <img src={cover.src} alt="" draggable={false} className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <span className="on-photo absolute inset-x-2.5 bottom-2.5 text-[14px] leading-tight font-bold">{memory.title}</span>
          </button>
        );
      })}
    </section>
  );
}

// 일 단위: 하루의 첫 사진을 크게 두고 그 위에 날짜와 장소를 얹은 뒤, 나머지를 3열로 잇는다(r1).
function DayView({ items, list }: { items: MediaItem[]; list: string[] }) {
  const ui = useUi();
  // 선택 중에는 칸 왼쪽 위에 동그라미가 생기므로 날짜 제목을 그만큼 비켜 둔다
  const titleLeft = ui.selection?.scope === scope ? "left-10" : "left-4";
  return (
    <div className="flex flex-col gap-3">
      {groupBy(items, dayKey).map((group) => {
        // 크게 둘 칸은 그날의 첫 사진이다. 동영상만 있는 날은 동영상을 쓴다.
        const first = group.items.find((item) => item.kind === "photo") ?? group.items[0];
        const rest = group.items.filter((item) => item !== first);
        return (
          <section key={group.key} data-group={group.key} aria-label={dayLabel(first.takenAt)}>
            <Tile
              item={first}
              scope={scope}
              list={list}
              large
              className="aspect-[4/3]"
              overlay={
                <>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-black/0" />
                  <span className={`on-photo pointer-events-none absolute top-3 ${titleLeft} text-left transition-[left] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]`}>
                    <span className="block text-[26px] leading-tight font-bold tracking-[-0.02em]">{dayLabel(first.takenAt)}</span>
                    <span className="block text-[14px] font-semibold opacity-90">{first.place.split(" ").slice(1).join(" ")}</span>
                  </span>
                </>
              }
            />
            {rest.length > 0 && (
              <div className="mt-[2px]">
                <Grid items={rest} scope={scope} list={list} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// 월과 연: 묶음마다 대표 사진 한 장에 제목과 장소, 개수를 얹은 카드
function CardList({
  groups,
  title,
  large = false,
  onOpen,
}: {
  groups: Group[];
  title: (group: Group) => string;
  large?: boolean;
  onOpen: (group: Group) => void;
}) {
  const gallery = useGallery();
  return (
    <div className="flex flex-col gap-3 px-4">
      {groups.map((group) => {
        const cover = coverOf(group.items, gallery.isFavorite);
        return (
          <button
            key={group.key}
            type="button"
            data-group={group.key}
            className={`relative overflow-hidden rounded-work bg-sunken text-left ${large ? "aspect-[4/5]" : "aspect-[3/2]"}`}
            onClick={() => onOpen(group)}
          >
            <img src={cover.src} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/0 to-black/40" />
            <span className="on-photo absolute top-3.5 left-4">
              <span className={`block leading-tight font-bold tracking-[-0.025em] ${large ? "text-[40px]" : "text-[26px]"}`}>{title(group)}</span>
              <span className="block text-[14px] font-semibold opacity-90">{uniqueAreas(group.items)}</span>
            </span>
            <span className="on-photo num absolute bottom-3 left-4 text-[13px] font-semibold">{counts(group.items)}</span>
          </button>
        );
      })}
    </div>
  );
}
