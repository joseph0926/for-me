import { FreeSlots } from "../components/FreeSlots";
import { Icon } from "../components/Icon";
import { PackCard, PriceButton, packContents, packPrices } from "../components/PackCard";
import { packs, passTiers, passTrack, season, type CurrencyId, type Pack } from "../data";
import { remainingPurchases, type ShopState } from "../shop";

const highlightId = "hero-pick";
const recommendedIds = ["gold", "basic", "rare-trio"];

export function Featured({
  state,
  onBuy,
  onClaimFree,
  onOpenPass,
}: {
  state: ShopState;
  onBuy: (pack: Pack, currency: CurrencyId) => void;
  onClaimFree: (slot: number) => void;
  onOpenPass: () => void;
}) {
  const highlight = packs.find((pack) => pack.id === highlightId);
  const recommended = recommendedIds.flatMap((id) => packs.filter((pack) => pack.id === id));

  return (
    <>
      {highlight ? <Highlight pack={highlight} state={state} onBuy={onBuy} /> : null}
      <section aria-label="보상과 시즌 패스" className="mt-7 grid gap-8 md:grid-cols-[1.25fr_1fr] md:gap-12">
        <FreeSlots slots={state.freeSlots} onClaim={onClaimFree} />
        <PassProgress state={state} onOpenPass={onOpenPass} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">추천 팩</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((pack) => (
            <PackCard key={pack.id} pack={pack} bought={state.bought} wallet={state.wallet} onBuy={(currency) => onBuy(pack, currency)} />
          ))}
        </div>
      </section>
    </>
  );
}

// 지금 단계와 바로 다음 보상. 패스가 없으면 패스 줄 보상은 잠긴 것으로 보인다.
function PassProgress({ state, onOpenPass }: { state: ShopState; onOpenPass: () => void }) {
  const tierName = passTiers.find((tier) => tier.id === state.passTier)?.name;
  const next = passTrack.find((step) => step.level === season.level + 1);
  const hasPass = state.passTier !== "free";

  return (
    <section aria-labelledby="pass-progress" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pass-progress" className="text-xl font-bold">{hasPass ? tierName : "시즌 패스"}</h2>
        <span className="text-[13px] text-muted tabular">
          {season.name}, {season.endsLabel}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between text-[13px] text-muted tabular">
        <span>단계</span>
        <span>
          <strong className="text-lg text-ink">{season.level}</strong> / {season.maxLevel}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel-raised">
        <div className="h-full bg-accent" style={{ width: `${(season.level / season.maxLevel) * 100}%` }} />
      </div>
      {next ? (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-muted">단계 {next.level} 무료</dt>
          <dd>{next.free}</dd>
          <dt className="text-muted">단계 {next.level} 패스</dt>
          <dd className={hasPass ? "" : "text-muted"}>
            {next.pass}
            {hasPass ? null : <Icon name="lock" className="ml-1.5 inline size-3.5 align-[-2px]" />}
          </dd>
        </dl>
      ) : null}
      <button
        type="button"
        onClick={onOpenPass}
        className="mt-4 text-[13px] text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-ink"
      >
        보상 줄 전체 보기
      </button>
    </section>
  );
}

function Highlight({ pack, state, onBuy }: { pack: Pack; state: ShopState; onBuy: (pack: Pack, currency: CurrencyId) => void }) {
  const soldOut = remainingPurchases(pack, state.bought) === 0;
  const [price] = packPrices(pack);

  return (
    <section className="hero store-hero" data-enter aria-labelledby="featured-pack">
      <img
        src={`/images/packs/${pack.id}.webp`}
        srcSet={`/images/packs/${pack.id}-480.webp 480w, /images/packs/${pack.id}.webp 900w`}
        sizes="(max-width: 699px) 100vw, 56vw"
        width="900"
        height="507"
        alt=""
        fetchPriority="high"
        className="grayscale"
      />
      <div className="store-hero-copy">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent">
          <Icon name="clock" className="size-4" />{pack.endsLabel}
        </span>
        <h1 id="featured-pack"><span className="sr-only">KICKLINE 27 상점 </span>{pack.name}</h1>
        <p className="text-sm text-ink/85">
          {packContents(pack)}, 계정당 {pack.limit}회
        </p>
        {soldOut ? (
          <p className="mt-6 font-semibold text-muted">구매 완료</p>
        ) : price ? (
          <div className="mt-6 flex max-w-60">
            <PriceButton pack={pack} currency={price[0]} amount={price[1]} wallet={state.wallet} onBuy={(currency) => onBuy(pack, currency)} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
