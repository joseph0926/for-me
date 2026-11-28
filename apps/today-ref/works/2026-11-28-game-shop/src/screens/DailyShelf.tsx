// 오늘의 상품(r1): 세로로 긴 큰 카드와 위아래로 쌓은 작은 카드 두 장을 가로로 잇고,
// 카드 아래 어두운 띠에 이름과 가격을 둔다. 줄이 화면보다 길면 아래 진행 막대가 넘김 정도를 보여 준다.
import { useEffect, useRef, useState } from "react";

import { ItemArt } from "../art";
import { dailySlots, getItem, rarityStyle, sectionEndsIn, type Item } from "../data";
import { Price, Remaining, useShop } from "../ui";
import type { DetailTarget } from "./ItemDetail";

export function DailyShelf({ onOpen }: { onOpen: (target: DetailTarget) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ start: 0, size: 1 });

  // 줄의 넓이는 창 크기에 따라 바뀌므로 크기가 바뀔 때마다 진행 막대를 다시 잰다.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () =>
      setScroll({ start: track.scrollLeft / track.scrollWidth, size: track.clientWidth / track.scrollWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, []);

  const overflowing = scroll.size < 0.999;

  return (
    <section aria-labelledby="daily-title">
      <div className="mb-4 flex items-baseline gap-4">
        <h2 id="daily-title" className="font-title text-[28px]">
          오늘의 상품
        </h2>
        <Remaining endsIn={sectionEndsIn.daily} className="text-[15px] text-muted" />
      </div>
      <div ref={trackRef} className="track -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {dailySlots.map((slot) =>
          slot.size === "large" ? (
            <ItemCard key={slot.itemId} item={getItem(slot.itemId)} size="large" onOpen={onOpen} />
          ) : (
            <div key={slot.itemIds.join()} className="flex shrink-0 snap-start flex-col gap-4">
              {slot.itemIds.map((id) => (
                <ItemCard key={id} item={getItem(id)} size="small" onOpen={onOpen} />
              ))}
            </div>
          ),
        )}
      </div>
      {overflowing && (
        <div className="relative mx-auto mt-4 h-1 w-1/2 rounded-work bg-line" aria-hidden="true">
          <div
            className="absolute inset-y-0 rounded-work bg-ink"
            style={{ left: `${scroll.start * 100}%`, width: `${scroll.size * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}

// 글자가 든 걸개는 잘리면 문구가 끊기므로 칸 안에 두고, 나머지 그림은 칸보다 크게 둔다.
function artPlace(item: Item, large: boolean): string {
  if (item.art.kind === "banner") return large ? "top-[18%] left-[-4%] w-[108%]" : "top-[-12%] left-[4%] w-[92%]";
  return large ? "top-[2%] left-[-14%] w-[128%]" : "top-[-30%] right-[-6%] w-[78%] -rotate-6";
}

function ItemCard({ item, size, onOpen }: { item: Item; size: "large" | "small"; onOpen: (target: DetailTarget) => void }) {
  const { state } = useShop();
  const owned = state.ownedItemIds.includes(item.id);
  const short = state.balance[item.price.currency] < item.price.amount;
  const large = size === "large";
  const rarity = rarityStyle[item.rarity];
  return (
    <button
      type="button"
      onClick={() => onOpen({ kind: "item", itemId: item.id })}
      className={`group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-work text-left ${
        large ? "h-[400px] w-[236px]" : "h-[192px] w-[236px]"
      }`}
      style={{ background: `radial-gradient(90% 70% at 50% 35%, color-mix(in oklab, ${rarity.line} 22%, ${rarity.ground}), ${rarity.ground})` }}
    >
      {/* 그림을 칸보다 크게 두고 가장자리에서 잘리게 해, 작은 그림이 빈 면 가운데 뜨지 않게 한다(r1 카드의 꽉 찬 상품 그림). */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ItemArt
          art={item.art}
          className={`absolute transition-transform duration-200 group-hover:scale-[1.04] ${artPlace(item, large)}`}
        />
      </div>
      {/* 이름 띠 위의 선이 등급 색이다(r1). 화면 읽기에는 등급 이름으로 읽힌다. */}
      <div className={`bg-strip ${large ? "px-4 pt-3 pb-3" : "px-3 pt-2 pb-2.5"}`} style={{ boxShadow: `inset 0 3px 0 ${rarity.line}` }}>
        <span className="sr-only">{rarity.name} 등급, </span>
        <div className={`truncate font-title ${large ? "mt-0.5 text-[18px]" : "text-[15px]"}`}>{item.name}</div>
        {/* 이름이 이미 종류를 말하므로 종류 줄을 두지 않고 가격만 오른쪽 끝에 둔다(r1). */}
        <div className="mt-1 flex items-center justify-end text-[13px]">
          {owned ? (
            <span className="font-extrabold text-muted">보유</span>
          ) : (
            <Price currency={item.price.currency} amount={item.price.amount} className={short ? "text-warn" : ""} />
          )}
        </div>
      </div>
    </button>
  );
}
