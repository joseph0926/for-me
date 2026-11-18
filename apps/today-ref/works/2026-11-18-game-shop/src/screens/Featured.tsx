import { CurrencyAmount } from "../components/Currency";
import { FreeSlots } from "../components/FreeSlots";
import { Icon } from "../components/Icon";
import { PackArt } from "../components/PackArt";
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
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.5fr_1fr]">
        {highlight ? <Highlight pack={highlight} state={state} onBuy={onBuy} /> : null}
        <div className="flex flex-col gap-4 sm:gap-5">
          <FreeSlots slots={state.freeSlots} onClaim={onClaimFree} />
          <button
            type="button"
            onClick={onOpenPass}
            className="group flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-accent/60 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-muted">
                  {season.name}, {season.endsLabel}
                </p>
                <p className="mt-1 text-[15px] font-bold">{state.passTier === "free" ? "시즌 패스로 보상 두 배" : `${tierName} 사용 중`}</p>
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-panel-raised text-muted transition group-hover:bg-accent group-hover:text-white">
                <Icon name="pass" className="size-[18px]" />
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[12px] text-muted tabular">
                <span>단계 {season.level}</span>
                <span>{season.maxLevel}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-raised">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(season.level / season.maxLevel) * 100}%` }} />
              </div>
            </div>
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-bold">추천 팩</h2>
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
    </div>
  );
}

function Highlight({ pack, state, onBuy }: { pack: Pack; state: ShopState; onBuy: (pack: Pack, currency: CurrencyId) => void }) {
  const soldOut = remainingPurchases(pack, state.bought) === 0;
  const price = pack.price.point;

  return (
    <section className="relative flex min-h-72 flex-col overflow-hidden rounded-2xl border border-hero/40 sm:min-h-80">
      <div className="absolute inset-0 sm:left-[30%]">
        <PackArt style={pack.style} size={pack.size} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(10_12_17/0.92)_0%,rgb(10_12_17/0.55)_55%,transparent)]" />
      <div className="relative mt-auto max-w-sm p-5 sm:p-7">
        <span className="inline-flex items-center gap-1 rounded-md bg-hero px-2 py-0.5 text-[11px] font-extrabold text-[#2a1206]">
          <Icon name="clock" className="size-3.5" />
          시즌 한정, {pack.endsLabel}
        </span>
        <h2 className="mt-3 text-2xl font-black sm:text-3xl">{pack.name}</h2>
        <p className="mt-2 text-[13px] text-ink/80">{pack.description}</p>
        <p className="mt-1 text-[12px] text-muted">
          {packContents(pack)}, 계정당 {pack.limit}회
        </p>
        {soldOut ? (
          <span className="mt-5 inline-flex h-11 items-center rounded-xl bg-panel-raised px-5 text-sm font-semibold text-muted">구매 완료</span>
        ) : price !== undefined ? (
          <button
            type="button"
            onClick={() => onBuy(pack, "point")}
            className="mt-5 inline-flex h-11 items-center gap-3 rounded-xl bg-hero px-5 text-sm font-extrabold text-[#2a1206] transition hover:brightness-110"
          >
            구매
            <span className="rounded-md bg-black/20 px-2 py-0.5">
              <CurrencyAmount currency="point" amount={price} />
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
