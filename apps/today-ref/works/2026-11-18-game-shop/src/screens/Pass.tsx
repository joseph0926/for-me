import { CurrencyAmount } from "../components/Currency";
import { Icon } from "../components/Icon";
import { passBenefits, passTiers, season, type PassTier } from "../data";
import { passUpgradeCost } from "../shop";

export function Pass({ current, onBuy }: { current: PassTier; onBuy: (tier: Exclude<PassTier, "free">) => void }) {
  const currentIndex = passTiers.findIndex((tier) => tier.id === current);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-muted">{season.endsLabel}</p>
          <h2 className="text-2xl font-black">{season.name} 패스</h2>
        </div>
        <p className="text-[13px] text-muted tabular">
          단계 {season.level} / {season.maxLevel}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[34%] sm:w-[40%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="p-3 text-left align-bottom text-[12px] font-semibold text-muted sm:p-4">
                혜택
              </th>
              {passTiers.map((tier, index) => {
                const owned = index <= currentIndex;
                const paidTier = tier.id === "free" ? null : tier.id;
                const cost = paidTier === null ? null : passUpgradeCost(current, paidTier);
                const upgrade = current !== "free" && cost !== null;
                return (
                  <th
                    key={tier.id}
                    scope="col"
                    className={`p-2 align-bottom sm:p-4 ${tier.id === current ? "bg-accent/10" : ""}`}
                  >
                    <span className="block text-[13px] font-extrabold sm:text-[15px]">{tier.name}</span>
                    <span className="mt-1 block h-4 text-[11px] font-medium text-muted tabular">
                      {tier.price > 0 ? <CurrencyAmount currency="point" amount={tier.price} /> : "기본 제공"}
                    </span>
                    <span className="mt-2 block">
                      {tier.id === current ? (
                        <span className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-accent/20 text-[12px] font-bold text-accent">
                          현재 등급
                        </span>
                      ) : owned ? (
                        <span className="inline-flex h-9 w-full items-center justify-center rounded-xl text-[12px] font-semibold text-muted">
                          포함됨
                        </span>
                      ) : paidTier !== null && cost !== null ? (
                        <button
                          type="button"
                          onClick={() => onBuy(paidTier)}
                          className="h-9 w-full rounded-xl bg-accent px-1 text-[12px] font-bold text-surface transition hover:brightness-110"
                        >
                          {upgrade ? "올리기" : "구매"}
                          {upgrade ? <span className="hidden sm:inline"> (차액 {cost.toLocaleString("ko-KR")})</span> : null}
                        </button>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {passBenefits.map((benefit) => (
              <tr key={benefit.label} className="border-t border-dashed border-line">
                <th scope="row" className="p-3 text-left font-medium sm:p-4">
                  {benefit.label}
                </th>
                {passTiers.map((tier) => {
                  const value = benefit.values[tier.id];
                  return (
                    <td key={tier.id} className={`p-2 text-center sm:p-4 ${tier.id === current ? "bg-accent/10" : ""}`}>
                      {value === true ? (
                        <span className="inline-grid size-6 place-items-center rounded-full bg-accent text-surface">
                          <Icon name="check" className="size-4" />
                          <span className="sr-only">포함</span>
                        </span>
                      ) : value === false ? (
                        <span className="text-muted/50" aria-label="없음">
                          –
                        </span>
                      ) : (
                        <span className="text-[12px] font-bold sm:text-[13px]">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
