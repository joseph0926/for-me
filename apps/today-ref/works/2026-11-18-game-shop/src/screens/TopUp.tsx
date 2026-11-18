import { pointBundles, type PointBundle } from "../data";
import { formatNumber, formatWon } from "../format";

// 묶음이 커질수록 쌓인 보석 수가 늘어난다.
function GemStack({ count }: { count: number }) {
  return (
    <div className="relative h-14 w-16 shrink-0" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        return (
          <svg
            key={index}
            viewBox="0 0 16 16"
            className="absolute size-7 drop-shadow-[0_2px_4px_rgb(0_0_0/0.5)]"
            style={{ left: `${column * 28 + row * 6}%`, bottom: `${row * 30 + (column === 1 ? 8 : 0)}%` }}
          >
            <path d="M8 1l6 4.5L8 15 2 5.5z" fill="var(--point)" />
            <path d="M2 5.5h12M8 1v14" stroke="#5b3a9c" strokeWidth="1" fill="none" />
          </svg>
        );
      })}
    </div>
  );
}

export function TopUp({ onBuy }: { onBuy: (bundle: PointBundle) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pointBundles.map((bundle, index) => (
        <div key={bundle.id} className="relative flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
          {bundle.badge ? (
            <span className="absolute -top-2 left-3 -rotate-3 rounded-md bg-hero px-2 py-0.5 text-[11px] font-extrabold text-[#2a1206] shadow-lg">
              {bundle.badge}
            </span>
          ) : null}
          <GemStack count={index + 1} />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold tabular">{formatNumber(bundle.points + bundle.bonus)}</p>
            <p className="text-[12px] text-muted tabular">
              {bundle.bonus > 0 ? `${formatNumber(bundle.points)} + 보너스 ${formatNumber(bundle.bonus)}` : "보너스 없음"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onBuy(bundle)}
            className="h-11 min-w-28 rounded-xl bg-point px-4 text-sm font-extrabold text-[#1d1235] tabular transition hover:brightness-110"
          >
            {formatWon(bundle.priceWon)}
          </button>
        </div>
      ))}
    </div>
  );
}
