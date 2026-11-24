// 울림: 세 단 SNS 웹. 왼쪽 메뉴(r1), 가운데 화면, 오른쪽 검색과 인기 주제와 추천(r3, r6).
// 글쓰기 창, 사진 크게 보기, 알림, 열어 둔 동안 들어오는 새 글과 반응은 여기 한 곳에서 띄운다.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useState, type ReactNode } from "react";

import { AppContext, type AppApi, type ToastAction } from "./app-context";
import { Composer, emptyDraft, type Draft } from "./components/Composer";
import { MobileTabBar, Sidebar } from "./components/Navigation";
import { PhotoViewer } from "./components/PhotoViewer";
import { RightRail } from "./components/RightRail";
import { maxToasts, Toasts, type Toast } from "./components/Toasts";
import { meId, type Photo } from "./data";
import { enterRoute } from "./history";
import { pageShift, pageTransition } from "./motion";
import { Explore } from "./pages/Explore";
import { Home } from "./pages/Home";
import { Notifications } from "./pages/Notifications";
import { PostDetail } from "./pages/PostDetail";
import { Profile } from "./pages/Profile";
import { Saved } from "./pages/Saved";
import { goToHash, navigate, parseRoute, routeDepth, screenKey, useHash, type Route } from "./router";
import { createInitialState, newPostId, reducer, simulationLength, type StoredPost } from "./store";

// 세 단의 폭. 글쓰기 창도 같은 격자를 써서 가운데 단 바로 아래에 붙는다.
const columns = "md:grid md:grid-cols-[76px_minmax(0,600px)] md:justify-center lg:grid-cols-[264px_600px_340px]";
const simulateEveryMs = 14_000;

export function App() {
  const [state, dispatch] = useReducer(reducer, Date.now(), createInitialState);
  const [now, setNow] = useState(() => Date.now());
  const [composer, setComposer] = useState<{ replyToId?: string } | null>(null);
  // 새 글과 답글마다 쓰던 글을 따로 남긴다. 키는 답글 대상 글 id, 새 글은 "new".
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hash = useHash();
  const route = parseRoute(hash);
  const key = screenKey(route);

  // 화면이 바뀐 렌더에서 이전 화면과 깊이를 비교해 전환 방향을 정한다.
  const [screen, setScreen] = useState({ key, depth: routeDepth(route), direction: 0 });
  if (screen.key !== key) {
    const depth = routeDepth(route);
    setScreen({ key, depth, direction: depth > screen.depth ? 1 : depth < screen.depth ? -1 : 0 });
  }

  useLayoutEffect(() => {
    window.scrollTo(0, enterRoute(hash));
  }, [hash]);

  // 같은 앱 안의 # 링크는 pushState로 옮긴다. 뒤로 가기만 popstate로 구별하기 위해서다.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest("a");
      const target = link?.getAttribute("href");
      if (!target?.startsWith("#")) return;
      event.preventDefault();
      goToHash(target);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // 상대 시각("3분")을 1분마다 다시 계산한다.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // 열어 둔 동안 새 글과 내 글에 대한 반응이 차례로 들어온다. 정해 둔 사건을 다 보내면 멈춘다.
  const simulationDone = state.simulated >= simulationLength;
  useEffect(() => {
    if (simulationDone) return;
    const timer = window.setInterval(() => dispatch({ type: "simulate", at: Date.now() }), simulateEveryMs);
    return () => window.clearInterval(timer);
  }, [simulationDone]);

  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const toast = useCallback((message: string, action?: ToastAction) => {
    setToasts((list) => [...list, { id: Date.now() + Math.random(), message, action }].slice(-maxToasts));
  }, []);

  const openComposer = useCallback((replyToId?: string) => setComposer({ replyToId }), []);
  const openViewer = useCallback((photos: Photo[], index: number) => setViewer({ photos, index }), []);
  const closeViewer = useCallback(() => setViewer(null), []);

  // n: 새 글. 입력 중이거나 다른 창이 열려 있으면 무시한다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      event.preventDefault();
      setComposer((current) => current ?? {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const api: AppApi = useMemo(
    () => ({ state, dispatch, now, openComposer, openViewer, toast }),
    [state, now, openComposer, openViewer, toast],
  );

  const draftKey = composer?.replyToId ?? "new";
  const draft = drafts[draftKey] ?? emptyDraft;
  const setDraft = useCallback(
    (update: Draft | ((current: Draft) => Draft)) =>
      setDrafts((all) => {
        const current = all[draftKey] ?? emptyDraft;
        return { ...all, [draftKey]: typeof update === "function" ? update(current) : update };
      }),
    [draftKey],
  );

  const discardDraft = (keyToDrop: string) =>
    setDrafts((all) => {
      for (const photo of all[keyToDrop]?.photos ?? []) URL.revokeObjectURL(photo.src);
      const rest = { ...all };
      delete rest[keyToDrop];
      return rest;
    });

  const closeComposer = () => {
    const hasContent = draft.text.trim() !== "" || draft.photos.length > 0;
    const keyToKeep = draftKey;
    setComposer(null);
    if (hasContent) toast("쓰던 글을 남겨 뒀어요", { label: "버리기", run: () => discardDraft(keyToKeep) });
  };

  const publish = () => {
    const replyToId = composer?.replyToId;
    const post: StoredPost = {
      id: newPostId(),
      authorId: meId,
      text: draft.text.trim(),
      createdAt: Date.now(),
      photos: draft.photos.map((photo) => ({ src: photo.src, alt: photo.name.replace(/\.[^.]+$/, ""), width: photo.width, height: photo.height })),
      replyToId,
      baseLikes: 0,
      baseReposts: 0,
      baseReplies: 0,
      baseSaves: 0,
    };
    dispatch({ type: "publish", post });
    // 사진 주소는 올린 글이 계속 쓰므로 해제하지 않고 초안만 비운다.
    setDrafts((all) => {
      const rest = { ...all };
      delete rest[draftKey];
      return rest;
    });
    setComposer(null);
    const showingParent = route.name === "post" && route.id === replyToId;
    const onHome = route.name === "home";
    if (!showingParent && !onHome) toast(replyToId ? "답글을 올렸어요" : "글을 올렸어요", { label: "보기", run: () => navigate({ name: "post", id: post.id }) });
    else toast(replyToId ? "답글을 올렸어요" : "글을 올렸어요");
    if (onHome && !replyToId) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppContext.Provider value={api}>
      <div className={`min-h-dvh ${columns}`}>
        <aside className="max-md:hidden">
          <Sidebar route={route} />
        </aside>
        {/* 새 글은 맨 위에 붙고 그때 맨 위로 올라간다. 브라우저의 스크롤 고정이 그 이동을 되밀지 않게 끈다. */}
        <main className="relative min-h-dvh bg-[var(--surface)] pb-24 [overflow-anchor:none] md:border-x md:border-[var(--line)] md:pb-16">
          <AnimatePresence mode="popLayout" initial={false} custom={screen.direction}>
            <motion.div
              key={key}
              custom={screen.direction}
              variants={{
                enter: (direction: number) => ({ x: direction * pageShift, opacity: 0, filter: "blur(2px)" }),
                center: { x: 0, opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } },
                exit: (direction: number) => ({ x: -direction * pageShift, opacity: 0, filter: "blur(2px)" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full"
            >
              <Screen route={route} />
            </motion.div>
          </AnimatePresence>
        </main>
        <aside className="max-lg:hidden">
          <RightRail showSearch={route.name !== "explore"} />
        </aside>
      </div>

      <MobileTabBar route={route} />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className={columns}>
          <span className="max-md:hidden" />
          <AnimatePresence>
            {composer && (
              <Composer
                key={draftKey}
                replyToId={composer.replyToId}
                draft={draft}
                onDraftChange={setDraft}
                onClose={closeComposer}
                onPublish={publish}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>{viewer && <PhotoViewer photos={viewer.photos} initialIndex={viewer.index} onClose={closeViewer} />}</AnimatePresence>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}

function Screen({ route }: { route: Route }): ReactNode {
  switch (route.name) {
    case "home":
      return <Home feedId={route.feed} />;
    case "explore":
      return <Explore q={route.q} />;
    case "notifications":
      return <Notifications filter={route.filter} />;
    case "saved":
      return <Saved />;
    case "profile":
      return <Profile handle={route.handle} tab={route.tab} />;
    case "post":
      return <PostDetail id={route.id} />;
  }
}
