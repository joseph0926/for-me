import { CurrencyAmount } from "../components/Currency";
import { FreeSlots } from "../components/FreeSlots";
import { Icon } from "../components/Icon";
import { PackCard, packContents } from "../components/PackCard";
import { packs, passTiers, season, type CurrencyId, type Pack } from "../data";
import { remainingPurchases, type ShopState } from "../shop";

const highlightId = "hero-pick";
const recommendedIds = ["gold", "basic", "rare-trio"];

export function Featured({
  state,
  onBuy,
  onToggleFavorite,
  onClaimFree,
  onOpenPass,
}: {
  state: ShopState;
  onBuy: (pack: Pack, currency: CurrencyId) => void;
  onToggleFavorite: (packId: string) => void;
  onClaimFree: (slot: number) => void;
  onOpenPass: () => void;
}) {
  const highlight = packs.find((pack) => pack.id === highlightId);
  const recommended = recommendedIds.flatMap((id) => packs.filter((pack) => pack.id === id));
  const tierName = passTiers.find((tier) => tier.id === state.passTier)?.name;

  return (
    <>
      {highlight ? <Highlight pack={highlight} state={state} onBuy={onBuy} /> : null}
      <section aria-label="보상과 시즌 패스" className="mt-6 grid gap-5 border-y border-line py-5 md:grid-cols-[1.2fr_1fr] md:gap-10">
        <FreeSlots slots={state.freeSlots} onClaim={onClaimFree} />
        <button
          type="button"
          onClick={onOpenPass}
          className="group flex flex-1 flex-col justify-between gap-5 border-t border-line pt-5 text-left md:border-t-0 md:border-l md:pt-0 md:pl-8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-muted">
                {season.name}, {season.endsLabel}
              </p>
              <p className="mt-1 text-xl font-bold">{state.passTier === "free" ? "시즌 패스" : `${tierName} 사용 중`}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-panel-raised text-muted transition group-hover:bg-accent group-hover:text-surface">
              <Icon name="pass" className="size-[18px]" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-[12px] text-muted tabular">
              <span>현재 단계</span>
              <span><strong className="text-lg text-ink">{season.level}</strong> / {season.maxLevel}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden bg-panel-raised">
              <div className="h-full bg-accent" style={{ width: `${(season.level / season.maxLevel) * 100}%` }} />
            </div>
          </div>
        </button>
      </section>

      <section className="mt-7 sm:mt-9">
        <h2 className="mb-3 text-xl font-bold">추천 팩</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              bought={state.bought}
              wallet={state.wallet}
              favorite={state.favorites.includes(pack.id)}
              onToggleFavorite={() => onToggleFavorite(pack.id)}
              onBuy={(currency) => onBuy(pack, currency)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function Highlight({ pack, state, onBuy }: { pack: Pack; state: ShopState; onBuy: (pack: Pack, currency: CurrencyId) => void }) {
  const soldOut = remainingPurchases(pack, state.bought) === 0;
  const price = pack.price.point;

  return (
    <section className="hero store-hero" data-enter aria-labelledby="featured-pack">
      <img src="/images/matchday.webp" srcSet="/images/matchday-720.webp 720w, /images/matchday.webp 1440w" sizes="(max-width: 699px) 100vw, (min-width: 1280px) 803px, 66vw" width="1440" height="960" alt="" fetchPriority="high" />
      <div className="store-hero-copy">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent">
          <Icon name="clock" className="size-4" />시즌 한정 / {pack.endsLabel}
        </span>
        <h1 id="featured-pack"><span className="sr-only">KICKLINE 27 상점 </span>{pack.name}</h1>
        <p className="text-sm leading-relaxed text-ink/85">{packContents(pack)}</p>
        <p className="mt-1 text-xs text-muted">계정당 {pack.limit}회 구매 가능</p>
        {soldOut ? (
          <p className="mt-6 font-semibold text-muted">구매 완료</p>
        ) : price !== undefined ? (
          <button type="button" onClick={() => onBuy(pack, "point")} className="mt-6 inline-flex min-h-12 items-center gap-5 bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-accent">
            팩 구매 <CurrencyAmount currency="point" amount={price} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
