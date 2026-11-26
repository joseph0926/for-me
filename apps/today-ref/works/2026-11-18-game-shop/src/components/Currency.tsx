import { motion } from "motion/react";

import { currencyLabel, type CurrencyId } from "../data";
import { formatNumber } from "../format";

export function CurrencyIcon({ currency, className = "size-4" }: { currency: CurrencyId; className?: string }) {
  if (currency === "coin") {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="var(--coin)" />
        <circle cx="8" cy="8" r="4.6" fill="none" stroke="#525d63" strokeWidth="1.4" />
      </svg>
    );
  }
  // 보석은 윗면과 아래 꼭짓점으로 그린다. 면 가운데를 가로지르는 선을 두면 밝은 바탕에서 십자가처럼 읽힌다.
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M4.6 2h6.8l3.1 4L8 14.5 1.5 6z" fill="var(--point)" stroke="#1f4650" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M1.5 6h13M5.9 6 8 14.5 10.1 6" stroke="#1f4650" strokeWidth="0.7" fill="none" strokeLinejoin="round" />
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
    <div className="flex h-10 items-center gap-1 pr-0 pl-0 text-xs min-[370px]:gap-1.5 min-[370px]:px-1 min-[370px]:text-sm sm:pl-3 font-semibold">
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
          className="grid size-11 place-items-center rounded-md bg-point/15 text-point transition hover:bg-point/25"
          aria-label={`${currencyLabel[currency]} 충전`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
