import {
  currencyLabel,
  currencyWith,
  passRewardLabel,
  passTiers,
  type CurrencyId,
  type Pack,
  type PassTier,
  type PointBundle,
  type Wallet,
} from "../data";
import { formatNumber, formatWon } from "../format";
import { passUpgradeCost } from "../shop";
import { CurrencyAmount, CurrencyIcon } from "./Currency";
import { PackArt } from "./PackArt";
import { packContents } from "./PackCard";

export type PurchaseItem =
  | { kind: "pack"; pack: Pack; currency: CurrencyId }
  | { kind: "bundle"; bundle: PointBundle }
  | { kind: "pass"; tier: Exclude<PassTier, "free"> };

export function PurchaseConfirm({
  item,
  wallet,
  passTier,
  onChangeCurrency,
  onConfirm,
  onCancel,
  onGoTopUp,
}: {
  item: PurchaseItem;
  wallet: Wallet;
  passTier: PassTier;
  onChangeCurrency: (currency: CurrencyId) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onGoTopUp: () => void;
}) {
  if (item.kind === "bundle") {
    const total = item.bundle.points + item.bundle.bonus;
    return (
      <Frame title="포인트 충전">
        <div className="flex items-center gap-3 rounded-md bg-panel-raised p-4">
          <CurrencyIcon currency="point" className="size-10" />
          <div>
            <p className="text-lg font-extrabold tabular">포인트 {formatNumber(total)}</p>
            {item.bundle.bonus > 0 ? (
              <p className="text-[12px] text-muted tabular">
                {formatNumber(item.bundle.points)} + 보너스 {formatNumber(item.bundle.bonus)}
              </p>
            ) : null}
          </div>
        </div>
        <BalanceLine currency="point" before={wallet.point} after={wallet.point + total} />
        <Actions confirmLabel={`${formatWon(item.bundle.priceWon)} 결제`} onConfirm={onConfirm} onCancel={onCancel} />
      </Frame>
    );
  }

  const cost =
    item.kind === "pack"
      ? { currency: item.currency, amount: item.pack.price[item.currency] ?? 0 }
      : { currency: "point" as const, amount: passUpgradeCost(passTier, item.tier) ?? 0 };
  const shortfall = cost.amount - wallet[cost.currency];

  return (
    <Frame title="구매 확인">
      {item.kind === "pack" ? (
        <PackSummary pack={item.pack} currency={item.currency} wallet={wallet} onChangeCurrency={onChangeCurrency} />
      ) : (
        <PassSummary tier={item.tier} current={passTier} />
      )}

      {shortfall > 0 ? (
        <div className="rounded-md bg-danger/10 p-4 text-[13px]">
          <p className="font-semibold text-danger tabular">
            {currencyWith[cost.currency].subject} {formatNumber(shortfall)} 부족합니다.
          </p>
          {cost.currency === "point" ? (
            <button type="button" onClick={onGoTopUp} className="btn btn-primary mt-3">
              포인트 충전하러 가기
            </button>
          ) : (
            <p className="mt-1 text-muted">코인은 경기 보상으로 모읍니다.</p>
          )}
        </div>
      ) : (
        <BalanceLine currency={cost.currency} before={wallet[cost.currency]} after={wallet[cost.currency] - cost.amount} />
      )}

      <Actions
        confirmLabel={shortfall > 0 ? "구매할 수 없음" : "구매"}
        confirmContent={shortfall > 0 ? null : <CurrencyAmount currency={cost.currency} amount={cost.amount} />}
        disabled={shortfall > 0}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Frame>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </div>
  );
}

function PackSummary({
  pack,
  currency,
  wallet,
  onChangeCurrency,
}: {
  pack: Pack;
  currency: CurrencyId;
  wallet: Wallet;
  onChangeCurrency: (currency: CurrencyId) => void;
}) {
  const options = (Object.keys(pack.price) as CurrencyId[]).filter((id) => pack.price[id] !== undefined);
  const commonOdds = Math.round((100 - pack.odds.rare - pack.odds.hero) * 10) / 10;

  return (
    <>
      <div className="flex gap-3">
        <PackArt pack={pack} className="aspect-[4/3] w-28 shrink-0 rounded-md" />
        <div className="min-w-0">
          <p className="font-bold">{pack.name}</p>
          <p className="mt-1 text-[13px] text-muted">{pack.description}</p>
          <p className="mt-1 text-[13px] text-muted">{packContents(pack)}</p>
          <p className="mt-2 text-[12px] text-muted tabular">
            장당 확률: 영웅 {pack.odds.hero}%, 희귀 {pack.odds.rare}%, 일반 {commonOdds}%
          </p>
        </div>
      </div>
      {options.length > 1 ? (
        <div role="radiogroup" aria-label="낼 재화" className="grid grid-cols-2 gap-2">
          {options.map((id) => {
            const selected = id === currency;
            const amount = pack.price[id] ?? 0;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChangeCurrency(id)}
                className={`flex h-12 flex-col items-center justify-center rounded-md text-sm font-bold transition-colors ${
                  selected ? "bg-panel-raised shadow-[inset_0_0_0_1px_var(--ink)]" : "shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel-raised"
                }`}
              >
                <CurrencyAmount currency={id} amount={amount} />
                <span className={`text-[11px] font-medium ${wallet[id] < amount ? "text-danger" : "text-muted"}`}>
                  {currencyWith[id].means} 내기
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function PassSummary({ tier, current }: { tier: Exclude<PassTier, "free">; current: PassTier }) {
  const name = passTiers.find((entry) => entry.id === tier)?.name;
  const currentName = passTiers.find((entry) => entry.id === current)?.name;
  return (
    <div className="rounded-md bg-panel-raised p-4">
      <p className="font-bold">{name}</p>
      {current !== "free" ? <p className="mt-1 text-[13px] text-muted">{currentName}에서 올리므로 차액만 냅니다.</p> : null}
      <p className="mt-1 text-[13px] text-muted">구매하면 바로 {passRewardLabel(tier)}를 엽니다.</p>
    </div>
  );
}

function BalanceLine({ currency, before, after }: { currency: CurrencyId; before: number; after: number }) {
  return (
    <div className="flex items-center justify-between px-1 text-[13px]">
      <span className="text-muted">보유 {currencyLabel[currency]}</span>
      <span className="flex items-center gap-2 font-semibold">
        <CurrencyAmount currency={currency} amount={before} className="text-muted" />
        <span className="text-muted">→</span>
        <CurrencyAmount currency={currency} amount={after} />
      </span>
    </div>
  );
}

function Actions({
  confirmLabel,
  confirmContent,
  disabled = false,
  onConfirm,
  onCancel,
}: {
  confirmLabel: string;
  confirmContent?: React.ReactNode;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.6fr] gap-2 pt-1">
      <button type="button" onClick={onCancel} className="btn btn-secondary">
        취소
      </button>
      <button
        type="button"
        autoFocus={!disabled}
        disabled={disabled}
        onClick={onConfirm}
        className="btn btn-primary"
      >
        {confirmLabel}
        {confirmContent ? <span className="text-[13px]">{confirmContent}</span> : null}
      </button>
    </div>
  );
}
