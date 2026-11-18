import { AnimatePresence } from "motion/react";
import { useReducer, useState } from "react";

import { CardReveal } from "./components/CardReveal";
import { WalletChip } from "./components/Currency";
import { Icon, type IconName } from "./components/Icon";
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

const sections: { id: SectionId; label: string; icon: IconName }[] = [
  { id: "featured", label: "추천", icon: "featured" },
  { id: "packs", label: "팩", icon: "packs" },
  { id: "topup", label: "포인트 충전", icon: "topup" },
  { id: "pass", label: "시즌 패스", icon: "pass" },
  { id: "history", label: "구매 내역", icon: "history" },
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

  const toggleFavorite = (packId: string) => dispatch({ type: "toggleFavorite", packId });
  const closeDialog = () => setDialog(null);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[104px_minmax(0,1fr)]">
      <nav aria-label="상점 구역" className="sticky top-0 hidden h-dvh flex-col items-center gap-1 border-r border-line bg-surface/60 py-5 md:flex">
        <span className="mb-5 grid size-11 place-items-center rounded-xl bg-ink text-[13px] font-black tracking-tight text-surface">KL</span>
        {sections.map((entry) => {
          const selected = entry.id === sectionId;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => selectSection(entry.id)}
              aria-current={selected ? "page" : undefined}
              className={`group relative flex w-[84px] flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-semibold transition ${
                selected ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {selected ? <span className="absolute top-3 -left-2.5 h-8 w-1 rounded-full bg-accent" /> : null}
              <span
                className={`grid size-11 place-items-center rounded-xl transition ${
                  selected ? "bg-accent text-white shadow-[0_6px_20px_rgb(76_141_255/0.4)]" : "bg-panel group-hover:bg-panel-raised"
                }`}
              >
                <Icon name={entry.icon} />
              </span>
              {entry.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="hidden text-[11px] font-bold tracking-[0.18em] text-muted sm:block">KICKLINE 27 상점</p>
              <h1 className="truncate text-lg font-extrabold sm:text-xl">{section.label}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <WalletChip currency="coin" amount={state.wallet.coin} />
              <WalletChip currency="point" amount={state.wallet.point} onAdd={() => goTo("topup")} />
            </div>
          </div>
          <nav aria-label="상점 구역" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {sections.map((entry) => {
              const selected = entry.id === sectionId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectSection(entry.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
                    selected ? "bg-accent text-white" : "text-muted"
                  }`}
                >
                  <Icon name={entry.icon} className="size-4" />
                  {entry.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {sectionId === "featured" ? (
            <Featured
              state={state}
              onBuy={openPack}
              onToggleFavorite={toggleFavorite}
              onClaimFree={claimFree}
              onOpenPass={() => goTo("pass")}
            />
          ) : sectionId === "packs" ? (
            <Packs state={state} onBuy={openPack} onToggleFavorite={toggleFavorite} />
          ) : sectionId === "topup" ? (
            <TopUp onBuy={openBundle} />
          ) : sectionId === "pass" ? (
            <Pass current={state.passTier} onBuy={openPass} />
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
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-white">
                  <Icon name="check" className="size-7" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold">{dialog.title}</h2>
                <p className="mt-1 text-sm text-muted">{dialog.message}</p>
                {dialog.resume ? (
                  <div className="mt-6 grid gap-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => dialog.resume && setDialog({ step: "confirm", item: dialog.resume })}
                      className="h-12 w-full rounded-2xl bg-accent text-[15px] font-bold text-white transition hover:brightness-110"
                    >
                      {itemName(dialog.resume)} 구매 계속
                    </button>
                    <button type="button" onClick={closeDialog} className="h-11 w-full rounded-2xl text-sm font-semibold text-muted hover:text-ink">
                      닫기
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    autoFocus
                    onClick={closeDialog}
                    className="mt-6 h-12 w-full rounded-2xl bg-accent text-[15px] font-bold text-white transition hover:brightness-110"
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
