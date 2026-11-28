// "속지": 탭(홈, 보관함)마다 화면 쌓임을 따로 두고, 그 위에 미니 플레이어, 재생 화면, 곡 더보기, 알림을 겹친다.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ActionSheet } from "./components/ActionSheet";
import { Icon } from "./components/Icon";
import { push, sheet } from "./motion";
import { MusicProvider } from "./MusicProvider";
import { MiniPlayer } from "./player/MiniPlayer";
import { NowPlaying } from "./player/NowPlaying";
import { Albums } from "./screens/Albums";
import { Collection } from "./screens/Collection";
import { Home } from "./screens/Home";
import { Library } from "./screens/Library";
import { UiContext, type Route, type Ui } from "./ui";

type Tab = "home" | "library";

const tabs: { id: Tab; label: string; icon: "home" | "library" }[] = [
  { id: "home", label: "홈", icon: "home" },
  { id: "library", label: "보관함", icon: "library" },
];

const toastMs = 2200;

// 앞으로 가면 오른쪽에서 들어오고 이전 화면은 왼쪽으로, 뒤로 가면 그 길을 거꾸로 간다. 탭을 바꾸면 제자리에서 바뀐다.
type Direction = 1 | -1 | 0;
const screenMotion = {
  enter: (direction: Direction) => ({ opacity: 0, x: 24 * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: Direction) => ({ opacity: 0, x: -24 * direction }),
};

// 화면마다 떠날 때의 스크롤 위치를 기억했다가 돌아오면 그 자리로 둔다.
function ScreenScroll({ id, saved, children }: { id: string; saved: Map<string, number>; children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (node.current) node.current.scrollTop = saved.get(id) ?? 0;
  }, [id, saved]);
  return (
    <div ref={node} data-scroll onScroll={(event) => saved.set(id, event.currentTarget.scrollTop)} className="scroll-hidden absolute inset-0 overflow-y-auto">
      {children}
    </div>
  );
}

export function App() {
  return (
    <MusicProvider>
      <Shell />
    </MusicProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [stacks, setStacks] = useState<Record<Tab, Route[]>>({ home: [], library: [] });
  const [playerOpen, setPlayerOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [direction, setDirection] = useState<Direction>(0);
  const [savedScroll] = useState(() => new Map<string, number>());

  const stack = stacks[tab];
  const route = stack.at(-1);

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const closePlayer = useCallback(() => setPlayerOpen(false), []);
  const closeActions = useCallback(() => setActionsFor(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toastMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const screenKey = `${tab}-${stack.length}-${route ? JSON.stringify(route) : "root"}`;

  const ui = useMemo<Ui>(
    () => ({
      open: (next) => {
        setPlayerOpen(false);
        setDirection(1);
        setStacks((current) => ({ ...current, [tab]: [...current[tab], next] }));
      },
      back: () => {
        // 떠난 상세의 스크롤은 잊어, 다시 열면 맨 위에서 시작한다.
        savedScroll.delete(screenKey);
        setDirection(-1);
        setStacks((current) => ({ ...current, [tab]: current[tab].slice(0, -1) }));
      },
      openActions: setActionsFor,
      notify,
    }),
    [tab, notify, savedScroll, screenKey],
  );

  function selectTab(next: Tab) {
    setDirection(0);
    // 지금 탭을 다시 누르면 그 탭의 처음 화면으로 돌아간다.
    if (next === tab) setStacks((current) => ({ ...current, [tab]: [] }));
    setTab(next);
  }

  // 위에 겹친 층이 있으면 아래 층은 누르거나 키보드로 닿지 않게 한다.
  const baseInert = playerOpen || actionsFor !== null;

  return (
    <UiContext value={ui}>
      <div className="relative flex h-full min-h-dvh flex-col bg-surface sm:min-h-0">
        <div inert={baseInert} className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.main
                key={screenKey}
                custom={direction}
                variants={screenMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={push}
                className="absolute inset-0"
              >
                <ScreenScroll id={screenKey} saved={savedScroll}>
                  {!route ? (
                    tab === "home" ? <Home /> : <Library />
                  ) : route.kind === "albums" ? (
                    <Albums />
                  ) : (
                    <Collection route={route} />
                  )}
                </ScreenScroll>
              </motion.main>
            </AnimatePresence>
          </div>

          <MiniPlayer onOpen={() => setPlayerOpen(true)} />

          <nav aria-label="탭" className="flex shrink-0 bg-surface">
            {tabs.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-accent-text" : "text-muted"}`}
                >
                  <Icon name={item.icon} size={22} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <AnimatePresence>{playerOpen && <NowPlaying key="player" onClose={closePlayer} inert={actionsFor !== null} />}</AnimatePresence>
        <AnimatePresence>{actionsFor && <ActionSheet key={actionsFor} trackId={actionsFor} onClose={closeActions} notify={notify} />}</AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={sheet}
              className="pointer-events-none absolute inset-x-4 bottom-[132px] z-50 rounded-work bg-ink px-4 py-3 text-center text-sm text-surface shadow-[var(--shadow)]"
            >
              {toast.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </UiContext>
  );
}
