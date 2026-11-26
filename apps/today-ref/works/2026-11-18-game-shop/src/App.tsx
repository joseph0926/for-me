import { AnimatePresence } from "motion/react";
import { useReducer, useState } from "react";

import { CardReveal } from "./components/CardReveal";
import { WalletChip } from "./components/Currency";
import { Icon } from "./components/Icon";
import { Modal } from "./components/Modal";
import { PurchaseConfirm, type PurchaseItem } from "./components/PurchaseConfirm";
import { freePack, packs, passRewards, passTiers, type CurrencyId, type Pack, type PassTier, type Player, type PointBundle } from "./data";
import { formatNumber } from "./format";
import { Featured } from "./screens/Featured";
import { History } from "./screens/History";
import { Packs } from "./screens/Packs";
import { Pass } from "./screens/Pass";
import { TopUp } from "./screens/TopUp";
import { createInitialState, drawCards, passUpgradeCost, remainingPurchases, shopReducer } from "./shop";

type SectionId = "featured" | "packs" | "topup" | "pass" | "history";

const sections: { id: SectionId; label: string }[] = [
  { id: "featured", label: "추천" },
  { id: "packs", label: "팩" },
  { id: "topup", label: "포인트 충전" },
  { id: "pass", label: "시즌 패스" },
  { id: "history", label: "구매 내역" },
];

type Dialog =
  | { step: "confirm"; item: PurchaseItem }
  | { step: "reveal"; title: string; cards: Player[] }
  | { step: "done"; title: string; message: string; resume: PurchaseItem | null };

function itemName(item: PurchaseItem): string {
  if (item.kind === "pack") return item.pack.name;
  if (item.kind === "bundle") return "포인트 충전";
  return passTiers.find((tier) => tier.id === item.tier)?.name ?? "";
}

export function App() {
  const [state, dispatch] = useReducer(shopReducer, undefined, () => createInitialState(Date.now()));
  const [sectionId, setSectionId] = useState<SectionId>("featured");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // 포인트가 모자라 충전하러 간 구매. 충전을 마치면 이 구매로 돌아갈 수 있다.
  const [pendingItem, setPendingItem] = useState<PurchaseItem | null>(null);
  const section = sections.find((entry) => entry.id === sectionId) ?? sections[0];

  const goTo = (id: SectionId) => {
    setSectionId(id);
    window.scrollTo({ top: 0 });
  };

  // 메뉴로 다른 구역에 가면 충전 뒤 돌아갈 구매를 잊는다.
  const selectSection = (id: SectionId) => {
    if (id !== "topup") setPendingItem(null);
    goTo(id);
  };

  const openPack = (pack: Pack, currency: CurrencyId) => setDialog({ step: "confirm", item: { kind: "pack", pack, currency } });
  const openBundle = (bundle: PointBundle) => setDialog({ step: "confirm", item: { kind: "bundle", bundle } });
  const openPass = (tier: Exclude<PassTier, "free">) => setDialog({ step: "confirm", item: { kind: "pass", tier } });

  const confirm = (item: PurchaseItem) => {
    const at = Date.now();
    if (item.kind === "pack") {
      const price = item.pack.price[item.currency];
      if (price === undefined || state.wallet[item.currency] < price || remainingPurchases(item.pack, state.bought) === 0) return;
      const cards = drawCards(item.pack);
      dispatch({ type: "buyPack", pack: item.pack, currency: item.currency, cards, at });
      setDialog({ step: "reveal", title: item.pack.name, cards });
      return;
    }
    if (item.kind === "bundle") {
      dispatch({ type: "buyPoints", bundle: item.bundle, at });
      const total = item.bundle.points + item.bundle.bonus;
      setDialog({ step: "done", title: "충전 완료", message: `${formatNumber(total)} 포인트가 들어왔습니다.`, resume: pendingItem });
      setPendingItem(null);
      return;
    }
    const cost = passUpgradeCost(state.passTier, item.tier);
    if (cost === null || state.wallet.point < cost) return;
    const reward = passRewards[item.tier];
    const rewardPack = packs.find((pack) => pack.id === reward.packId);
    const cards = rewardPack ? Array.from({ length: reward.count }, () => drawCards(rewardPack)).flat() : [];
    dispatch({ type: "buyPass", tier: item.tier, at });
    const tierName = passTiers.find((tier) => tier.id === item.tier)?.name ?? "";
    setDialog({ step: "reveal", title: `${tierName} 구매 보상`, cards });
  };

  const claimFree = (slot: number) => {
    const at = Date.now();
    const target = state.freeSlots[slot];
    if (target?.kind !== "timer" || target.readyAt > at) return;
    const cards = drawCards(freePack);
    dispatch({ type: "claimFree", slot, cards, at });
    setDialog({ step: "reveal", title: freePack.name, cards });
  };

  const closeDialog = () => setDialog(null);

  return (
    <div className="min-h-dvh">
      <a href="#shop-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3 focus:text-black">상점 본문으로 이동</a>
      <div>
        <header className="nav border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex min-h-16 items-center justify-between gap-2 border-b border-line sm:min-h-20">
              <p className="shrink-0 text-[clamp(17px,4.5vw,32px)] leading-none font-black tracking-[-.06em] italic">
                KICKLINE<span className="ml-1 text-accent">27</span>
              </p>
              <div className="flex items-center gap-1 sm:gap-3">
                <WalletChip currency="coin" amount={state.wallet.coin} />
                <WalletChip currency="point" amount={state.wallet.point} onAdd={() => goTo("topup")} />
              </div>
            </div>
            <nav aria-label="상점 구역" className="flex justify-between gap-1 sm:justify-start sm:gap-7">
              {sections.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectSection(entry.id)}
                  aria-current={entry.id === sectionId ? "page" : undefined}
                  className="h-12 min-w-11 border-b-2 border-transparent px-1 text-[13px] font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink sm:px-2 sm:text-sm"
                >
                  {entry.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main id="shop-content" tabIndex={-1} className="wrap mx-auto w-[calc(100%-1.5rem)] max-w-[76rem] pt-4 pb-10 sm:w-[calc(100%-3rem)] sm:pt-6 lg:w-[calc(100%-4rem)]">
          {sectionId !== "featured" && <h1 className="mb-5 text-3xl font-extrabold tracking-tight">{section.label}</h1>}
          {sectionId === "featured" ? (
            <Featured
              state={state}
              onBuy={openPack}
              onClaimFree={claimFree}
              onOpenPass={() => goTo("pass")}
            />
          ) : sectionId === "packs" ? (
            <Packs state={state} onBuy={openPack} />
          ) : sectionId === "topup" ? (
            <TopUp onBuy={openBundle} />
          ) : sectionId === "pass" ? (
            <Pass current={state.passTier} wallet={state.wallet} onBuy={openPass} />
          ) : (
            <History entries={state.history} />
          )}
        </main>
      </div>

      <AnimatePresence>
        {dialog ? (
          <Modal
            key={dialog.step}
            label={dialog.step === "confirm" ? "구매 확인" : dialog.title}
            wide={dialog.step === "reveal"}
            onClose={closeDialog}
          >
            {dialog.step === "confirm" ? (
              <PurchaseConfirm
                item={dialog.item}
                wallet={state.wallet}
                passTier={state.passTier}
                onChangeCurrency={(currency) => {
                  if (dialog.item.kind === "pack") setDialog({ step: "confirm", item: { ...dialog.item, currency } });
                }}
                onConfirm={() => confirm(dialog.item)}
                onCancel={closeDialog}
                onGoTopUp={() => {
                  setPendingItem(dialog.item);
                  closeDialog();
                  goTo("topup");
                }}
              />
            ) : dialog.step === "reveal" ? (
              <CardReveal title={dialog.title} cards={dialog.cards} onDone={closeDialog} />
            ) : (
              <div className="p-6 text-center">
                <Icon name="check" className="mx-auto size-8 text-accent" />
                <h2 className="mt-3 text-xl font-bold">{dialog.title}</h2>
                <p className="mt-1 text-sm text-muted">{dialog.message}</p>
                {dialog.resume ? (
                  <div className="mt-6 grid gap-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => dialog.resume && setDialog({ step: "confirm", item: dialog.resume })}
                      className="btn btn-primary w-full"
                    >
                      {itemName(dialog.resume)} 구매 계속
                    </button>
                    <button type="button" onClick={closeDialog} className="btn btn-secondary w-full">
                      닫기
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    autoFocus
                    onClick={closeDialog}
                    className="btn btn-primary mt-6 min-w-32"
                  >
                    확인
                  </button>
                )}
              </div>
            )}
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
