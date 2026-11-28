import { AnimatePresence } from "motion/react";
import { useEffect, useReducer, useState } from "react";

import { getPack } from "./data";
import { ConfirmDialog } from "./screens/ConfirmDialog";
import { ClubScreen } from "./screens/ClubScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ItemDetail, type DetailTarget } from "./screens/ItemDetail";
import { PackOpening } from "./screens/PackOpening";
import { StoreScreen } from "./screens/StoreScreen";
import { TopBar, type Tab } from "./screens/TopBar";
import { drawPack, initialState, shopReducer, type Purchase } from "./shop";
import { ShopContext } from "./ui";

const tabs: Tab[] = ["home", "club", "store"];

function tabFromHash(): Tab {
  const name = window.location.hash.replace("#", "");
  return tabs.find((tab) => tab === name) ?? "home";
}

export function App() {
  const [state, dispatch] = useReducer(shopReducer, initialState);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  // 구매 확인 창, 또는 머리줄 + 버튼으로 연 충전 창. 둘은 함께 열리지 않는다.
  const [dialog, setDialog] = useState<Purchase | "charge" | null>(null);
  const [opening, setOpening] = useState<{ packId: string; playerIds: string[] } | null>(null);

  // 주소의 #store, #club으로 바로 그 탭을 연다. 뒤로 가기도 탭을 따라간다.
  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Esc는 맨 위에 열린 것 하나만 닫는다. 팩 개봉 중에는 버튼으로만 나간다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || opening) return;
      if (dialog) setDialog(null);
      else if (detail) setDetail(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, detail, opening]);

  function goTo(next: Tab) {
    if (next === "club") dispatch({ type: "markSeen" });
    window.location.hash = next;
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  function confirmPurchase(purchase: Purchase) {
    if (purchase.kind === "pack") {
      const playerIds = state.previews[purchase.packId] ?? drawPack(getPack(purchase.packId));
      dispatch({ type: "buy", purchase, packPlayerIds: playerIds });
      setOpening({ packId: purchase.packId, playerIds });
    } else {
      dispatch({ type: "buy", purchase });
    }
    setDialog(null);
  }

  return (
    <ShopContext value={{ state, dispatch }}>
      <div className="min-h-dvh">
        <div inert={detail !== null || dialog !== null || opening !== null}>
          <TopBar tab={tab} onTab={goTo} onCharge={() => setDialog("charge")} />
          <main>
            {tab === "home" && <HomeScreen onTab={goTo} />}
            {tab === "club" && <ClubScreen />}
            {tab === "store" && <StoreScreen onOpen={setDetail} onBuy={setDialog} />}
          </main>
        </div>
        <AnimatePresence>
          {detail && (
            <ItemDetail
              key="detail"
              target={detail}
              inert={dialog !== null}
              onClose={() => setDetail(null)}
              onBuy={setDialog}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {dialog && (
            <ConfirmDialog
              key="dialog"
              purchase={dialog === "charge" ? null : dialog}
              onCancel={() => setDialog(null)} onConfirm={confirmPurchase} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {opening && (
            <PackOpening
              key="opening"
              packId={opening.packId}
              playerIds={opening.playerIds}
              onClose={() => setOpening(null)}
              onClub={() => {
                setOpening(null);
                goTo("club");
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </ShopContext>
  );
}
