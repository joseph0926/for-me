import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { MobileTabBar, MobileTopBar } from "./components/MobileNav";
import { RightRail } from "./components/RightRail";
import { Sidebar, type NavId } from "./components/Sidebar";
import { AppContext, type AppControls } from "./context";
import { navigate, parseHash, useHash, type Route } from "./router";
import { AlertsScreen } from "./screens/AlertsScreen";
import { ComposeDialog } from "./screens/ComposeDialog";
import { CreatorScreen } from "./screens/CreatorScreen";
import { ExploreScreen } from "./screens/ExploreScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { JoinDialog } from "./screens/JoinDialog";
import { LiveScreen } from "./screens/LiveScreen";
import { MeScreen } from "./screens/MeScreen";
import { PostScreen } from "./screens/PostScreen";
import { appReducer, creatorById, initialState } from "./store";

type Overlay = { kind: "join"; creatorId: string; tier: "member" | "close" } | { kind: "compose"; creatorId: string } | null;
type Toast = { id: number; message: string };

const CLOCK_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 2_400;

function navIdOf(route: Route): NavId | null {
  return route.name === "home" || route.name === "explore" || route.name === "alerts" || route.name === "me" ? route.name : null;
}

// 오른쪽 보조 열은 피드처럼 가운데 열이 좁은 화면에서만 둔다. 표지와 격자가 넓은 화면에서는 뺀다.
function showsRightRail(route: Route): boolean {
  return route.name === "home" || route.name === "alerts" || route.name === "post";
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const hash = useHash();
  const route = useMemo(() => parseHash(hash), [hash]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [now, setNow] = useState(Date.now);
  // 앱 안에서 이동한 횟수. 0이면 뒤로 가기가 다른 사이트로 나가지 않게 홈으로 보낸다.
  const inAppDepth = useRef(0);

  // 주소가 바뀌면 새 화면을 맨 위부터 보여 주고, 크리에이터 페이지를 열었다는 사실을 남긴다.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (route.name === "creator") {
      dispatch({ type: "visitCreator", creatorId: route.creatorId, at: Date.now() });
      if (route.tab === "schedule") dispatch({ type: "seeSchedule", creatorId: route.creatorId });
    }
  }, [route]);

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

  const go = useCallback((next: Route) => {
    inAppDepth.current += 1;
    navigate(next);
  }, []);

  const back = useCallback(() => {
    if (inAppDepth.current > 0) {
      inAppDepth.current -= 1;
      window.history.back();
    } else {
      navigate({ name: "home" });
    }
  }, []);

  const closeOverlay = useCallback(() => setOverlay(null), []);

  const controls = useMemo<AppControls>(
    () => ({
      state,
      dispatch,
      now,
      go,
      back,
      openJoin: (creatorId, tier) => setOverlay({ kind: "join", creatorId, tier }),
      openCompose: (creatorId) => setOverlay({ kind: "compose", creatorId }),
      showToast: (message) => setToast({ id: Date.now(), message }),
    }),
    [state, now, go, back],
  );

  const unread = state.notifications.filter((item) => !state.readNotifications.includes(item.id)).length;
  const navId = navIdOf(route);

  return (
    <AppContext.Provider value={controls}>
      <div className="flex min-h-dvh bg-surface">
        <Sidebar active={navId} unread={unread} current={route} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="min-w-0 flex-1">
            <Screen route={route} />
          </main>
        </div>
        {showsRightRail(route) && <RightRail />}
        <MobileTabBar active={navId} unread={unread} />
      </div>

      <AnimatePresence>
        {overlay?.kind === "join" && <JoinDialog key="join" creatorId={overlay.creatorId} tierId={overlay.tier} onClose={closeOverlay} />}
        {overlay?.kind === "compose" && <ComposeDialog key="compose" creatorId={overlay.creatorId} onClose={closeOverlay} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            role="status"
            className="pointer-events-none fixed bottom-20 left-1/2 z-50 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl bg-ink/90 px-4 py-3 text-center text-[13.5px] font-medium text-surface md:bottom-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {toast.message}
          </motion.p>
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <HomeScreen />;
    case "explore":
      return <ExploreScreen />;
    case "alerts":
      return <AlertsScreen />;
    case "me":
      return <MeScreen />;
    case "creator":
      return <CreatorScreen key={route.creatorId} creatorId={route.creatorId} tab={route.tab} />;
    case "post":
      return <PostScreen key={route.postId} postId={route.postId} />;
    case "live":
      return <LiveScreen key={route.creatorId} creatorId={route.creatorId} />;
    case "notFound":
      return <NotFound />;
  }
}

function NotFound() {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <p className="text-[15px] text-muted">찾을 수 없는 페이지예요</p>
      <a href="#/" className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface">
        홈으로
      </a>
    </div>
  );
}
