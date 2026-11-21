import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useState, type ComponentType } from "react";

import { TabBar } from "./components/TabBar";
import { TabStack } from "./components/TabStack";
import { AppContext, type AppControls } from "./context";
import { TAB_IDS, initialNav, navReducer, type Screen, type TabId } from "./navigation";
import { AlertsScreen } from "./screens/AlertsScreen";
import { ComposeSheet } from "./screens/ComposeSheet";
import { CreatorScreen } from "./screens/CreatorScreen";
import { ExploreScreen } from "./screens/ExploreScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LiveScreen } from "./screens/LiveScreen";
import { MeScreen } from "./screens/MeScreen";
import { MembershipSheet } from "./screens/MembershipSheet";
import { PostScreen } from "./screens/PostScreen";
import { appReducer, creatorById, initialState } from "./store";

type Overlay = { kind: "membership"; creatorId: string } | { kind: "compose"; creatorId: string } | null;
type Toast = { id: number; message: string };

const CLOCK_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 2_200;

const tabRoots: Record<TabId, ComponentType> = {
  home: HomeScreen,
  explore: ExploreScreen,
  alerts: AlertsScreen,
  me: MeScreen,
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [nav, navDispatch] = useReducer(navReducer, initialNav);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [liveCreatorId, setLiveCreatorId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [now, setNow] = useState(Date.now);

  // "3분 전" 같은 상대 시간을 갱신한다.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  // 내가 올린 팬 글에 크리에이터 답글이 도착하는 시점을 예약한다. 서버 푸시를 흉내 낸다.
  useEffect(() => {
    const timers = state.pendingReplies.map((pending) =>
      window.setTimeout(
        () => {
          const at = Date.now();
          dispatch({ type: "deliverReply", postId: pending.postId, at });
          setNow(at);
          setToast({ id: at, message: `${creatorById(pending.creatorId).name} 님이 내 팬 글에 댓글을 남겼어요` });
        },
        Math.max(0, pending.dueAt - Date.now()),
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state.pendingReplies]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const open = useCallback((screen: Screen) => {
    if (screen.name === "creator") {
      dispatch({ type: "visitCreator", creatorId: screen.creatorId, at: Date.now() });
      if (screen.section === "schedule") dispatch({ type: "seeSchedule", creatorId: screen.creatorId });
    }
    navDispatch({ type: "push", screen });
  }, []);

  const controls = useMemo<AppControls>(
    () => ({
      state,
      dispatch,
      now,
      open,
      back: () => navDispatch({ type: "pop" }),
      selectTab: (tab) => navDispatch({ type: "selectTab", tab }),
      openMembership: (creatorId) => setOverlay({ kind: "membership", creatorId }),
      openCompose: (creatorId) => setOverlay({ kind: "compose", creatorId }),
      openLive: (creatorId) => setLiveCreatorId(creatorId),
      showToast: (message) => setToast({ id: Date.now(), message }),
    }),
    [state, now, open],
  );

  const unread = state.notifications.filter((item) => !state.readNotifications.includes(item.id)).length;
  const closeOverlay = () => setOverlay(null);

  return (
    <AppContext.Provider value={controls}>
      <div className="relative flex h-full flex-col overflow-hidden bg-surface">
        <main className="relative min-h-0 flex-1">
          {TAB_IDS.map((tab) => {
            const Root = tabRoots[tab];
            return (
              <TabStack
                key={tab}
                isActive={nav.tab === tab}
                root={<Root />}
                stack={nav.stacks[tab]}
                renderScreen={(screen) =>
                  screen.name === "creator" ? (
                    <CreatorScreen creatorId={screen.creatorId} initialSection={screen.section} />
                  ) : (
                    <PostScreen postId={screen.postId} focusComment={screen.focusComment} />
                  )
                }
              />
            );
          })}
        </main>
        <TabBar active={nav.tab} unread={unread} onSelect={(tab) => navDispatch({ type: "selectTab", tab })} />

        <AnimatePresence>
          {overlay?.kind === "membership" && <MembershipSheet key="membership" creatorId={overlay.creatorId} onClose={closeOverlay} />}
          {overlay?.kind === "compose" && <ComposeSheet key="compose" creatorId={overlay.creatorId} onClose={closeOverlay} />}
        </AnimatePresence>
        <AnimatePresence>
          {liveCreatorId && <LiveScreen key="live" creatorId={liveCreatorId} onClose={() => setLiveCreatorId(null)} />}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast.id}
              role="status"
              className="pointer-events-none absolute inset-x-6 bottom-20 z-50 rounded-xl bg-ink/90 px-4 py-3 text-center text-[13.5px] font-medium text-surface"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              {toast.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
}
