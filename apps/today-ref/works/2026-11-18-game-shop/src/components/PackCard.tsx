import { currencyLabel, rarityLabel, type CurrencyId, type Pack, type Wallet } from "../data";
import { formatNumber } from "../format";
import { remainingPurchases } from "../shop";
import { CurrencyAmount } from "./Currency";
import { Icon } from "./Icon";
import { PackArt } from "./PackArt";

// 팩 내용은 확률에서 만든다. 모든 장이 희귀 이상이면 보장 한 명보다 그 사실을 적는다.
export function packContents(pack: Pack): string {
  if (pack.odds.rare + pack.odds.hero >= 100) return `선수 ${pack.size}명, 모두 희귀 이상`;
  const guaranteed = pack.guaranteed ? `, ${rarityLabel[pack.guaranteed]}${pack.guaranteed === "hero" ? "" : " 이상"} 1명 보장` : "";
  return `선수 ${pack.size}명${guaranteed}`;
}

export function packPrices(pack: Pack): [CurrencyId, number][] {
  return (Object.entries(pack.price) as [CurrencyId, number | undefined][]).flatMap(([currency, amount]) =>
    amount === undefined ? [] : [[currency, amount] as [CurrencyId, number]],
  );
}

// 가격 버튼 한 모양. 잔액이 모자라도 칸은 흐리게 하지 않고 가격만 빨갛게 둔다(tastepin 게임 상점 값).
// 누르면 구매 확인 창이 모자란 양과 충전 길을 보여 준다.
export function PriceButton({
  pack,
  currency,
  amount,
  wallet,
  onBuy,
  className = "",
}: {
  pack: Pack;
  currency: CurrencyId;
  amount: number;
  wallet: Wallet;
  onBuy: (currency: CurrencyId) => void;
  className?: string;
}) {
  const short = wallet[currency] < amount;
  return (
    <button
      type="button"
      onClick={() => onBuy(currency)}
      aria-label={`${pack.name} 구매, ${currencyLabel[currency]} ${formatNumber(amount)}${short ? ", 잔액 부족" : ""}`}
      className={`btn btn-secondary flex-1 ${className}`}
    >
      <CurrencyAmount currency={currency} amount={amount} className={short ? "text-danger" : ""} />
    </button>
  );
}

export function PackCard({
  pack,
  bought,
  wallet,
  onBuy,
}: {
  pack: Pack;
  bought: Record<string, number>;
  wallet: Wallet;
  onBuy: (currency: CurrencyId) => void;
}) {
  const remaining = remainingPurchases(pack, bought);
  const soldOut = remaining === 0;

  return (
    <article className={`flex flex-col overflow-hidden rounded-md bg-panel ${soldOut ? "opacity-60" : ""}`}>
      <PackArt pack={pack} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-[15px] font-bold">{pack.name}</h3>
          <p className="mt-1 text-[13px] text-muted">{packContents(pack)}</p>
          {remaining !== null || pack.endsLabel ? (
            <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted">
              {remaining !== null ? (
                <span className={soldOut ? "" : "text-ink"}>{soldOut ? "모두 구매함" : `계정당 ${remaining}회 남음`}</span>
              ) : null}
              {pack.endsLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="size-3.5" />
                  {pack.endsLabel}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex gap-2">
          {soldOut ? (
            <span className="flex min-h-11 flex-1 items-center justify-center text-sm font-semibold text-muted">구매 완료</span>
          ) : (
            packPrices(pack).map(([currency, amount]) => (
              <PriceButton key={currency} pack={pack} currency={currency} amount={amount} wallet={wallet} onBuy={onBuy} />
            ))
          )}
        </div>
      </div>
    </article>
  );
}
