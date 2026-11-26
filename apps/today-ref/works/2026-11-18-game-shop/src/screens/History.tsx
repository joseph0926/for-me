import { CurrencyAmount } from "../components/Currency";
import { formatDateTime, formatWon } from "../format";
import type { HistoryEntry } from "../shop";

export function History({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">이번 접속에서 구매하거나 받은 것이 없습니다.</p>;
  }

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-md bg-panel">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-4 px-4 py-3">
          <time className="w-24 shrink-0 pt-0.5 text-[12px] text-muted tabular">{formatDateTime(entry.at)}</time>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{entry.title}</p>
            <p className="mt-0.5 text-[13px] text-muted">{entry.detail}</p>
          </div>
          <span className="shrink-0 pt-0.5 text-[13px] font-semibold">
            {entry.cost.kind === "currency" ? (
              <CurrencyAmount currency={entry.cost.currency} amount={-entry.cost.amount} />
            ) : entry.cost.kind === "won" ? (
              <span className="tabular">{formatWon(entry.cost.amount)}</span>
            ) : (
              <span className="text-muted">무료</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
