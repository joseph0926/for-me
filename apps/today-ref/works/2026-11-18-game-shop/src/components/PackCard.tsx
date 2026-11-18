import { currencyLabel, rarityLabel, type CurrencyId, type Pack, type Wallet } from "../data";
import { formatNumber } from "../format";
import { remainingPurchases } from "../shop";
import { CurrencyAmount } from "./Currency";
import { Icon } from "./Icon";
import { PackArt } from "./PackArt";

export function packContents(pack: Pack): string {
  const guaranteed = pack.guaranteed ? `, ${rarityLabel[pack.guaranteed]}${pack.guaranteed === "hero" ? "" : " 이상"} 1명 보장` : "";
  return `선수 ${pack.size}명${guaranteed}`;
}

export function PackCard({
  pack,
  bought,
  wallet,
  favorite,
  onToggleFavorite,
  onBuy,
}: {
  pack: Pack;
  bought: Record<string, number>;
  wallet: Wallet;
  favorite: boolean;
  onToggleFavorite: () => void;
  onBuy: (currency: CurrencyId) => void;
}) {
  const remaining = remainingPurchases(pack, bought);
  const soldOut = remaining === 0;
  const prices = (Object.entries(pack.price) as [CurrencyId, number][]).filter(([, amount]) => amount !== undefined);

  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-panel ${soldOut ? "opacity-60" : ""}`}>
      <PackArt style={pack.style} size={pack.size} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold">{pack.name}</h3>
            <p className="mt-1 text-[13px] leading-snug text-muted">{pack.description}</p>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? `${pack.name} 즐겨찾기 해제` : `${pack.name} 즐겨찾기`}
            className={`-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-panel-raised ${favorite ? "text-coin" : "text-muted"}`}
          >
            <Icon name="star" filled={favorite} className="size-[18px]" />
          </button>
        </div>

        <ul className="space-y-1 text-[12px] text-muted">
          <li>{packContents(pack)}</li>
          <li className="flex flex-wrap gap-x-2">
            {remaining === null ? (
              <span>반복 구매 가능</span>
            ) : (
              <span className={soldOut ? "" : "text-ink"}>
                계정당 {pack.limit}회, {soldOut ? "모두 구매함" : `${remaining}회 남음`}
              </span>
            )}
            {pack.endsLabel ? (
              <span className="inline-flex items-center gap-1 text-hero">
                <Icon name="clock" className="size-3.5" />
                {pack.endsLabel}
              </span>
            ) : null}
          </li>
        </ul>

        <div className="mt-auto flex gap-2">
          {soldOut ? (
            <span className="flex h-10 flex-1 items-center justify-center rounded-xl bg-panel-raised text-sm font-semibold text-muted">
              구매 완료
            </span>
          ) : (
            prices.map(([currency, amount]) => {
              const short = wallet[currency] < amount;
              return (
                <button
                  key={currency}
                  type="button"
                  onClick={() => onBuy(currency)}
                  aria-label={`${pack.name} 구매, ${currencyLabel[currency]} ${formatNumber(amount)}`}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-bold transition ${
                    short
                      ? "border-line bg-transparent text-muted hover:border-danger/60"
                      : "border-transparent bg-panel-raised hover:bg-accent hover:text-white"
                  }`}
                >
                  <CurrencyAmount currency={currency} amount={amount} className={short ? "text-danger/90" : ""} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </article>
  );
}
