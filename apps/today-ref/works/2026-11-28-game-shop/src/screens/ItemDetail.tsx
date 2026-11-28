// 상품을 고른 뒤의 화면(r2): 상품 하나를 크게 띄우고, 묶음이면 왼쪽에 든 항목 목록과
// 오른쪽 아래에 절약액이 붙은 묶음 구매와 단품 구매 두 버튼을 둔다.
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { ItemArt } from "../art";
import { featuredBundle, getItem, rarityStyle } from "../data";
import { fade } from "../motion";
import { bundleOwned, bundlePrice, type Purchase } from "../shop";
import { Button, numberFormat, Price, useShop } from "../ui";

export type DetailTarget = { kind: "bundle"; itemId: string } | { kind: "item"; itemId: string };

// 상세는 상품 색 위에 놓이므로 보조 버튼(닫기, 단품 구매, 보유)의 테두리와 글자를 흰색으로 바꾼다. 높이와 글자는 공통 버튼 그대로다.
const onArt = "border-white/40 text-white hover:bg-white/10";

export function ItemDetail({
  target,
  inert,
  onClose,
  onBuy,
}: {
  target: DetailTarget;
  inert: boolean;
  onClose: () => void;
  onBuy: (purchase: Purchase) => void;
}) {
  const { state } = useShop();
  const [shownId, setShownId] = useState(target.itemId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shown = getItem(shownId);
  const inBundle = target.kind === "bundle";
  const owned = state.ownedItemIds.includes(shown.id);

  // 열리면 닫기 버튼으로 초점을 옮겨, 키보드로 바로 Esc나 Tab을 쓸 수 있게 한다.
  useEffect(() => closeRef.current?.focus(), []);

  const price = bundlePrice(state);
  const unownedTotal = featuredBundle.itemIds
    .filter((id) => !state.ownedItemIds.includes(id))
    .reduce((sum, id) => sum + getItem(id).price.amount, 0);
  const saving = unownedTotal - price;

  return (
    <motion.div
      {...fade}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
      inert={inert}
      className="fixed inset-0 z-30 overflow-y-auto"
      style={{ background: `radial-gradient(70% 70% at 50% 45%, ${rarityStyle[shown.rarity].ground} 0%, #0b0c0e 100%)` }}
    >
      <div className="relative mx-auto flex min-h-full max-w-[1320px] flex-col px-4 pt-5 pb-6 sm:px-8 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="w-[88px] sm:w-[120px]" />
          <h2 id="detail-title" className="text-center font-title text-[30px] leading-tight text-white sm:text-[44px]">
            {shown.name}
          </h2>
          <Button ref={closeRef} onClick={onClose} className={`w-[88px] sm:w-[120px] ${onArt}`}>
            닫기
            <kbd className="hidden font-sans text-[12px] text-white/60 sm:inline">Esc</kbd>
          </Button>
        </div>

        <div className="relative flex flex-1 flex-col items-center gap-6 py-6 lg:flex-row lg:items-center">
          {inBundle && (
            <ol className="order-2 flex w-full gap-2 overflow-x-auto lg:order-none lg:w-[260px] lg:flex-col" aria-label="묶음에 든 항목">
              {featuredBundle.itemIds.map((id) => {
                const item = getItem(id);
                const current = id === shown.id;
                const has = state.ownedItemIds.includes(id);
                return (
                  <li key={id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => setShownId(id)}
                      className={`flex h-14 w-[200px] items-center gap-3 rounded-work px-3 text-left text-[14px] transition-colors duration-150 lg:w-full ${
                        current ? "bg-white/20 text-white ring-1 ring-white/70" : "bg-black/25 text-white/80 hover:bg-black/35"
                      }`}
                    >
                      <ItemArt art={item.art} className="size-10 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-bold">{item.name}</span>
                      {has && <span className="text-[12px] font-extrabold text-white/70">보유</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
            className="flex flex-1 items-center justify-center"
          >
            <ItemArt art={shown.art} className="h-[min(52vh,460px)] w-[min(52vh,460px)] max-w-full" />
          </motion.div>
          {inBundle && <div className="hidden lg:block lg:w-[260px]" />}
        </div>

        <div className="flex flex-wrap items-end justify-end gap-3">
          {inBundle && !bundleOwned(state) && (
            <div className="flex flex-col items-center gap-1.5">
              {saving > 0 && (
                <span className="text-[13px] font-extrabold text-white">{numberFormat.format(saving)} 절약</span>
              )}
              <BuyButton
                label="묶음 구매"
                amount={price}
                currency="points"
                onClick={() => onBuy({ kind: "bundle", bundleId: featuredBundle.id })}
                primary
              />
            </div>
          )}
          {owned ? (
            <Button disabled className={onArt}>
              보유
            </Button>
          ) : (
            <BuyButton
              label="단품 구매"
              amount={shown.price.amount}
              currency={shown.price.currency}
              onClick={() => onBuy({ kind: "item", itemId: shown.id })}
              primary={!inBundle}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BuyButton({
  label,
  amount,
  currency,
  onClick,
  primary,
}: {
  label: string;
  amount: number;
  currency: "coins" | "points";
  onClick: () => void;
  primary?: boolean;
}) {
  const { state } = useShop();
  const short = state.balance[currency] < amount;
  return (
    <Button
      variant={primary ? "primary" : "secondary"}
      onClick={onClick}
      className={`min-w-[180px] ${primary ? "" : onArt}`}
    >
      {label}
      <Price currency={currency} amount={amount} className={short ? (primary ? "text-[#7a1d12]" : "text-warn") : ""} />
    </Button>
  );
}
