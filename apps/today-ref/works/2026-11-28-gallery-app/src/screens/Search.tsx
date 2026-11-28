// 검색. 장소, 나들이 이름, 주제로 찾고, 가장 잘 맞는 사진 여섯 칸 중 마지막을 "+N"으로 덮는다(r2).
import { useState } from "react";

import { Grid } from "../components/Grid";
import { Icon } from "../components/Icon";
import { ScreenHeader } from "../components/ScreenHeader";
import { Tile } from "../components/Tile";
import { outingById, searchTopics, type MediaItem } from "../data";
import { dayKey, dayLabel } from "../format";
import { useGallery } from "../gallery";

const scope = "search";
const bestCount = 6;

// 장소와 나들이 이름이 맞으면 주제만 맞을 때보다 앞에 둔다
function score(item: MediaItem, query: string) {
  const outing = outingById.get(item.outingId)!;
  if (item.area.includes(query) || outing.title.includes(query)) return 3;
  if (item.place.includes(query)) return 2;
  if (item.tags.some((tag) => tag.includes(query))) return 1;
  return 0;
}

export function Search() {
  const gallery = useGallery();
  const [query, setQuery] = useState("");
  // 검색어마다 "+N"을 눌러 펼쳤는지. 검색어가 바뀌면 다시 접힌다.
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const trimmed = query.trim();

  const places = [...new Map(gallery.visible.map((item) => [item.area, item])).values()];

  return (
    <div className="scroll-area h-full pb-8">
      <ScreenHeader title="검색" scope={scope} />
      <div className="sticky top-[62px] z-10 bg-surface/95 px-4 pb-3">
        <label className="flex h-10 items-center gap-2 rounded-work bg-sunken px-3 text-muted">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            placeholder="장소, 나들이, 주제"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query !== "" && (
            <button type="button" aria-label="검색어 지우기" className="grid size-6 place-items-center" onClick={() => setQuery("")}>
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
      </div>

      {trimmed === "" ? (
        <>
          <section>
            <h2 className="px-4 text-[17px] font-bold">장소</h2>
            <div className="scroll-area mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-1">
              {places.map((item) => (
                <button key={item.area} type="button" className="w-[96px] shrink-0 text-left" onClick={() => setQuery(item.area)}>
                  <span className="block aspect-square overflow-hidden rounded-work bg-sunken">
                    <img src={item.thumb} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover" />
                  </span>
                  <span className="mt-1.5 block text-[14px] font-semibold">{item.area}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="mt-6 px-4">
            <h2 className="text-[17px] font-bold">주제</h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {searchTopics.map((topic) => (
                <button key={topic} type="button" className="h-9 rounded-work bg-sunken px-3.5 text-[14px] font-semibold" onClick={() => setQuery(topic)}>
                  {topic}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <Results
          query={trimmed}
          items={gallery.visible}
          expanded={expandedFor === trimmed}
          onExpand={() => setExpandedFor(trimmed)}
        />
      )}
    </div>
  );
}

function Results({ query, items, expanded, onExpand }: { query: string; items: MediaItem[]; expanded: boolean; onExpand: () => void }) {
  const matched = items.filter((item) => score(item, query) > 0);
  if (matched.length === 0) {
    return <p className="px-6 pt-16 text-center text-[15px] text-muted">'{query}'에 맞는 사진이 없습니다</p>;
  }

  const best = [...matched].sort((a, b) => score(b, query) - score(a, query) || b.takenAt.localeCompare(a.takenAt));
  const list = best.map((item) => item.id);
  const shown = expanded ? best : best.slice(0, bestCount);
  const rest = best.length - bestCount;

  const byDay: { key: string; items: MediaItem[] }[] = [];
  for (const item of matched) {
    const key = dayKey(item.takenAt);
    const last = byDay.at(-1);
    if (last?.key === key) last.items.push(item);
    else byDay.push({ key, items: [item] });
  }
  const recentList = matched.map((item) => item.id);

  return (
    <>
      <section>
        <h2 className="num px-4 pb-2.5 text-[17px] font-bold">
          가장 잘 맞는 사진 <span className="text-[14px] font-semibold text-muted">{matched.length}</span>
        </h2>
        <div className="grid grid-cols-3 gap-[2px]">
          {shown.map((item, index) => {
            const covered = !expanded && rest > 0 && index === bestCount - 1;
            if (!covered) return <Tile key={item.id} item={item} scope={scope} list={list} />;
            return (
              <button key={item.id} type="button" aria-label={`나머지 ${rest}장 더 보기`} className="relative aspect-square overflow-hidden" onClick={onExpand}>
                <img src={item.thumb} alt="" draggable={false} className="h-full w-full object-cover" />
                <span className="num absolute inset-0 grid place-items-center bg-black/45 text-[24px] font-bold text-white">+{rest}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="mt-6">
        <h2 className="px-4 pb-1 text-[17px] font-bold">최근 순</h2>
        {byDay.map((group) => (
          <div key={group.key}>
            <h3 className="px-4 pt-3 pb-2 text-[14px] font-semibold text-muted">
              {dayLabel(group.key)} {outingById.get(group.items[0].outingId)!.title}
            </h3>
            <Grid items={group.items} scope={scope} list={recentList} />
          </div>
        ))}
      </section>
    </>
  );
}
