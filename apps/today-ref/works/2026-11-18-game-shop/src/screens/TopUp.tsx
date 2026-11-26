import { CurrencyIcon } from "../components/Currency";
import { pointBundles, type PointBundle } from "../data";
import { formatNumber, formatWon } from "../format";

// 보너스가 있는 상품은 모두 같은 형식으로 보너스율을 적어 서로 비교할 수 있게 한다.
function bonusLine(bundle: PointBundle): string | null {
  if (bundle.bonus === 0) return null;
  const rate = Math.round((bundle.bonus / bundle.points) * 100);
  return `${formatNumber(bundle.points)} + 보너스 ${formatNumber(bundle.bonus)} (${rate}%)`;
}

export function TopUp({ onBuy }: { onBuy: (bundle: PointBundle) => void }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-md bg-panel">
      {pointBundles.map((bundle) => {
        const bonus = bonusLine(bundle);
        return (
          <li key={bundle.id} className="flex min-h-16 items-center gap-4 px-4 py-3">
            <CurrencyIcon currency="point" className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold tabular">포인트 {formatNumber(bundle.points + bundle.bonus)}</p>
              {bonus ? <p className="text-[13px] text-muted tabular">{bonus}</p> : null}
            </div>
            <button type="button" onClick={() => onBuy(bundle)} className="btn btn-primary min-w-28 tabular">
              {formatWon(bundle.priceWon)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
