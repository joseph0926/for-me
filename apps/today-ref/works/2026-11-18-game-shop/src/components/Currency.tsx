import { motion } from "motion/react";

import { currencyLabel, type CurrencyId } from "../data";
import { formatNumber } from "../format";

export function CurrencyIcon({ currency, className = "size-4" }: { currency: CurrencyId; className?: string }) {
  if (currency === "coin") {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="var(--coin)" />
        <circle cx="8" cy="8" r="4.6" fill="none" stroke="#8a6512" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M8 1l6 4.5L8 15 2 5.5z" fill="var(--point)" />
      <path d="M2 5.5h12M8 1v14" stroke="#5b3a9c" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function CurrencyAmount({
  currency,
  amount,
  className = "",
}: {
  currency: CurrencyId;
  amount: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 tabular ${className}`}>
      <CurrencyIcon currency={currency} />
      <span>{formatNumber(amount)}</span>
      <span className="sr-only">{currencyLabel[currency]}</span>
    </span>
  );
}

// 머리줄의 보유 재화. 값이 바뀌면 숫자가 위에서 내려오며 바뀐다.
export function WalletChip({ currency, amount, onAdd }: { currency: CurrencyId; amount: number; onAdd?: () => void }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-full border border-line bg-panel/80 pr-1 pl-3 text-sm font-semibold">
      <CurrencyIcon currency={currency} className="size-[18px]" />
      <span className="relative overflow-hidden tabular" aria-label={`${currencyLabel[currency]} ${formatNumber(amount)}`}>
        <motion.span
          key={amount}
          className="block"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {formatNumber(amount)}
        </motion.span>
      </span>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="grid size-8 place-items-center rounded-full bg-point/15 text-point transition hover:bg-point/25"
          aria-label={`${currencyLabel[currency]} 충전`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <span className="w-2" />
      )}
    </div>
  );
}
