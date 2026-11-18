import { CurrencyAmount } from "../components/Currency";
import { formatTime, formatWon } from "../format";
import type { HistoryEntry } from "../shop";

export function History({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
        이번 접속에서 구매하거나 받은 것이 여기에 쌓입니다.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
          <time className="w-16 shrink-0 text-[12px] text-muted tabular">{formatTime(entry.at)}</time>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{entry.title}</p>
            <p className="truncate text-[12px] text-muted">{entry.detail}</p>
          </div>
          <span className="shrink-0 text-[13px] font-semibold">
            {entry.cost.kind === "currency" ? (
              <CurrencyAmount currency={entry.cost.currency} amount={-entry.cost.amount} />
            ) : entry.cost.kind === "won" ? (
              <span className="tabular">{formatWon(entry.cost.amount)}</span>
            ) : (
              <span className="text-accent">무료</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
