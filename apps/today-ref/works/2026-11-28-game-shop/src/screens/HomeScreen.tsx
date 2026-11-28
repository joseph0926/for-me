// 게임 홈. 상점으로 들어가는 칸과, 상점에서 받은 것이 돌아와 보이는 클럽 칸만 둔다(규칙 C6).
import { ItemArt } from "../art";
import { featuredBundle, getItem, getPlayer, sectionEndsIn } from "../data";
import { Button, Remaining, useShop } from "../ui";
import type { Tab } from "./TopBar";

export function HomeScreen({ onTab }: { onTab: (tab: Tab) => void }) {
  const { state } = useShop();
  const [home, away] = featuredBundle.itemIds.map(getItem);
  const recent = state.recent.slice(0, 4);

  return (
    <div className="mx-auto grid max-w-[1320px] gap-4 px-4 pt-6 pb-16 sm:px-8 sm:pt-8 lg:grid-cols-[1.4fr_1fr]">
      <section
        aria-labelledby="home-store"
        className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-work p-6"
        style={{ background: "radial-gradient(70% 120% at 82% 20%, #2a3242 0%, #1a1c21 60%, #15161a 100%)" }}
      >
        <div className="pointer-events-none absolute right-0 bottom-0 h-full w-1/2" aria-hidden="true">
          <ItemArt art={away.art} className="absolute top-[14%] right-[4%] w-[52%] rotate-12" />
          <ItemArt art={home.art} className="absolute top-[8%] right-[30%] w-[60%]" />
        </div>
        <div className="relative">
          <h2 id="home-store" className="font-title text-[28px] text-white">
            상점
          </h2>
          <p className="mt-3 text-[15px] font-bold text-white">{featuredBundle.name}</p>
          <Remaining endsIn={sectionEndsIn.featured} className="mt-1 text-[14px] text-white/80" />
          <p className="mt-4 text-[15px] font-bold text-white">오늘의 상품 8개</p>
          <Remaining endsIn={sectionEndsIn.daily} className="mt-1 text-[14px] text-white/80" />
        </div>
        <Button variant="primary" className="relative self-start" onClick={() => onTab("store")}>
          상점 열기
        </Button>
      </section>

      <section aria-labelledby="home-club" className="flex flex-col rounded-work bg-raised p-6">
        <div className="flex items-baseline justify-between">
          <h2 id="home-club" className="font-title text-[28px]">
            내 클럽
          </h2>
          <span className="text-[14px] text-muted tabular">
            선수 {state.clubPlayerIds.length}명, 아이템 {state.ownedItemIds.length}개
          </span>
        </div>
        <h3 className="mt-5 text-[14px] font-bold text-muted">최근 받은 것</h3>
        {recent.length === 0 ? (
          <p className="mt-2 text-[15px]">아직 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {recent.map((entry) => (
              <li key={entry.key} className="flex h-11 items-center gap-3 border-b border-line text-[15px] last:border-b-0">
                {entry.kind === "player" ? <PlayerLine id={entry.id} /> : <ItemLine id={entry.id} />}
                {!state.seen && <span className="ml-auto text-[12px] font-extrabold text-accent">새로 받음</span>}
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-auto self-start" onClick={() => onTab("club")}>
          클럽 보기
        </Button>
      </section>
    </div>
  );
}

function PlayerLine({ id }: { id: string }) {
  const player = getPlayer(id);
  return (
    <>
      <span className="w-7 font-extrabold tabular">{player.rating}</span>
      <span className="w-10 text-muted">{player.position}</span>
      <span className="truncate">{player.name}</span>
    </>
  );
}

function ItemLine({ id }: { id: string }) {
  const item = getItem(id);
  return (
    <>
      <ItemArt art={item.art} className="size-7 shrink-0" />
      <span className="truncate">{item.name}</span>
    </>
  );
}
