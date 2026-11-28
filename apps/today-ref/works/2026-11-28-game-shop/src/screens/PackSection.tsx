// 선수 팩(r3): 팩을 같은 폭의 세로 기둥으로 나란히 두고, 고른 기둥을 채운 색으로 강조하며
// 오른쪽 패널에 그 팩의 설명, 확률, 미리보기와 두 가격의 구매를 둔다.
import { useState } from "react";

import { PackSleeve, PlayerCard } from "../art";
import { getPlayer, packs, tierName, type Currency, type Pack } from "../data";
import { drawPack, type Purchase } from "../shop";
import { Button, numberFormat, Price, useShop } from "../ui";

export function PackSection({ onBuy }: { onBuy: (purchase: Purchase) => void }) {
  const [selectedId, setSelectedId] = useState(packs[2].id);
  const selected = packs.find((pack) => pack.id === selectedId) ?? packs[0];

  return (
    <section aria-labelledby="packs-title">
      <h2 id="packs-title" className="mb-4 font-title text-[28px]">
        선수 팩
      </h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="track -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:flex-1" role="radiogroup" aria-label="팩 고르기">
          {packs.map((pack) => (
            <PackColumn key={pack.id} pack={pack} selected={pack.id === selected.id} onSelect={() => setSelectedId(pack.id)} />
          ))}
        </div>
        <PackPanel key={selected.id} pack={selected} onBuy={onBuy} />
      </div>
    </section>
  );
}

function PackColumn({ pack, selected, onSelect }: { pack: Pack; selected: boolean; onSelect: () => void }) {
  const { state } = useShop();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={pack.name}
      onClick={onSelect}
      // 고른 기둥은 채운 색(r3)에 더해 160ms에 4px 떠오르고 아래 그림자를 둔다(tastepin 게임 상점 상품 선택 값).
      className={`mt-1 flex w-[164px] shrink-0 flex-col items-center rounded-work px-3 pt-4 pb-3 transition-[background-color,transform,box-shadow] duration-[160ms] lg:w-auto lg:flex-1 ${
        selected
          ? "-translate-y-1 bg-[color-mix(in_oklab,var(--accent)_16%,var(--raised))] shadow-[0_10px_24px_rgb(0_0_0/0.4)] ring-1 ring-accent"
          : "bg-raised hover:bg-[color-mix(in_oklab,var(--ink)_6%,var(--raised))]"
      }`}
    >
      <div className="h-[2.6em] text-center font-title text-[17px] leading-tight">{pack.name}</div>
      <div className="relative mt-2">
        <PackSleeve pack={pack} className="h-[150px] w-[106px]" />
        {pack.preview && (
          <span className="absolute top-[-6px] right-[-14px] inline-flex items-center gap-1 rounded-work bg-accent px-2 py-1 text-[12px] font-extrabold text-accent-ink">
            <EyeIcon />
            미리보기
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col items-center gap-0.5 text-[15px]">
        <Price currency="coins" amount={pack.coins} className={state.balance.coins < pack.coins ? "text-warn" : ""} />
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          또는
          <Price currency="points" amount={pack.points} className={state.balance.points < pack.points ? "text-warn" : "text-ink"} />
        </span>
      </div>
      <dl className="mt-3 grid w-full grid-cols-3 gap-1 text-center">
        <Count value={pack.count} label="선수" tone="plain" />
        <Count value={pack.count} label={tierName[pack.tier]} tone={pack.tier} />
        <Count value={pack.rares} label="레어" tone="rare" />
      </dl>
    </button>
  );
}

const countTones = {
  plain: "bg-sunken text-ink",
  bronze: "bg-[#c98a5a] text-[#2b160a]",
  silver: "bg-[#c9d0d7] text-[#1c232b]",
  gold: "bg-[#e2b54c] text-[#2a1c05]",
  rare: "bg-ink text-surface",
} as const;

function Count({ value, label, tone }: { value: number; label: string; tone: keyof typeof countTones }) {
  return (
    <div className={`flex flex-col rounded-work py-1.5 leading-none ${countTones[tone]}`}>
      <dd className="order-first font-title text-[18px] tabular">{value}</dd>
      <dt className="mt-1 text-[11px] font-extrabold">{label}</dt>
    </div>
  );
}

function PackPanel({ pack, onBuy }: { pack: Pack; onBuy: (purchase: Purchase) => void }) {
  const { state, dispatch } = useShop();
  const [oddsOpen, setOddsOpen] = useState(false);
  const preview = state.previews[pack.id];

  function buy(currency: Currency) {
    onBuy({ kind: "pack", packId: pack.id, currency });
  }

  return (
    <aside className="flex flex-col rounded-work bg-sunken p-5 lg:w-[360px]" aria-label={`${pack.name} 설명`}>
      <h3 className="font-title text-[26px] leading-tight">{pack.name}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{pack.description}</p>

      <button
        type="button"
        aria-expanded={oddsOpen}
        onClick={() => setOddsOpen((open) => !open)}
        className="mt-4 self-start text-[14px] font-bold text-muted underline decoration-1 underline-offset-4 hover:text-ink"
      >
        {oddsOpen ? "확률 닫기" : "팩 확률 보기"}
      </button>
      {oddsOpen && (
        <table className="mt-2 w-full text-[14px]">
          <caption className="pb-2 text-left text-[12px] text-muted">이 조건의 선수가 한 명 이상 나올 확률</caption>
          <tbody>
            {pack.odds.map((odds) => (
              <tr key={odds.label} className="border-t border-line">
                <th scope="row" className="py-2 text-left font-bold">
                  {odds.label}
                </th>
                <td className="py-2 text-right font-extrabold tabular">{formatChance(odds.chance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pack.preview && (
        <div className="mt-5 border-t border-line pt-4">
          {preview ? (
            <PreviewContents playerIds={preview} />
          ) : (
            <Button onClick={() => dispatch({ type: "preview", packId: pack.id, playerIds: drawPack(pack) })}>
              <EyeIcon />
              미리보기
            </Button>
          )}
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
        <PriceButton currency="coins" amount={pack.coins} onClick={() => buy("coins")} />
        <PriceButton currency="points" amount={pack.points} onClick={() => buy("points")} />
      </div>
    </aside>
  );
}

function PreviewContents({ playerIds }: { playerIds: string[] }) {
  const sorted = playerIds.map(getPlayer).sort((a, b) => b.rating - a.rating);
  const [best, ...rest] = sorted;
  return (
    <div className="flex gap-4">
      <PlayerCard player={best} size="sm" />
      <ol className="flex-1 text-[13px]" aria-label="미리 본 선수">
        {rest.map((player) => (
          <li key={player.id} className="flex items-center gap-2 py-[3px]">
            <span className="w-6 font-extrabold tabular">{player.rating}</span>
            <span className="w-9 text-muted">{player.position}</span>
            <span className="truncate">{player.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PriceButton({ currency, amount, onClick }: { currency: Currency; amount: number; onClick: () => void }) {
  const { state } = useShop();
  const short = state.balance[currency] < amount;
  return (
    <Button onClick={onClick} aria-label={`${currency === "coins" ? "코인" : "포인트"} ${numberFormat.format(amount)}으로 구매`}>
      <Price currency={currency} amount={amount} className={short ? "text-warn" : ""} />
    </Button>
  );
}

function formatChance(chance: number): string {
  return `${Number((chance * 100).toFixed(1))}%`;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M1.5 8 Q8 1.5 14.5 8 Q8 14.5 1.5 8 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}
