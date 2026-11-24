// 왼쪽 단(r1 Mastodon): 메뉴, 접히는 팔로우한 주제 묶음, 글쓰기 버튼, 맨 아래 내 계정.
// 중간 너비에서는 아이콘 열로 줄고, 휴대폰 너비에서는 아래 탭 막대와 떠 있는 글쓰기 버튼으로 바뀐다.
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { useApp } from "../app-context";
import { meId } from "../data";
import { easeOutCubic, press } from "../motion";
import { href, type Route } from "../router";
import { unreadNotifications } from "../store";
import { Avatar } from "./Avatar";
import { BellIcon, BookmarkIcon, ChevronIcon, HomeIcon, PenIcon, SearchIcon, UserIcon } from "./Icons";

const followedTopics = ["첫눈", "베이킹", "주말산책"];

interface NavEntry {
  key: Route["name"];
  label: string;
  href: string;
  icon: (filled: boolean) => ReactNode;
}

function useEntries(): NavEntry[] {
  const { state } = useApp();
  const me = state.users[meId];
  return [
    { key: "home", label: "홈", href: "#/", icon: (filled) => <HomeIcon size={22} filled={filled} /> },
    { key: "explore", label: "둘러보기", href: "#/explore", icon: () => <SearchIcon size={22} /> },
    { key: "notifications", label: "알림", href: "#/notifications", icon: (filled) => <BellIcon size={22} filled={filled} /> },
    { key: "saved", label: "저장함", href: "#/saved", icon: (filled) => <BookmarkIcon size={22} filled={filled} /> },
    { key: "profile", label: "프로필", href: href({ name: "profile", handle: me.handle, tab: "posts" }), icon: (filled) => <UserIcon size={22} filled={filled} /> },
  ];
}

// 내 프로필일 때만 프로필 메뉴를 현재 위치로 본다. 다른 사람 프로필과 글 상세는 어느 메뉴에도 속하지 않는다.
function isCurrent(entry: NavEntry, route: Route, myHandle: string) {
  if (entry.key === "profile") return route.name === "profile" && route.handle === myHandle;
  return entry.key === route.name;
}

export function Sidebar({ route }: { route: Route }) {
  const { state, openComposer } = useApp();
  const me = state.users[meId];
  const unread = unreadNotifications(state);
  const [topicsOpen, setTopicsOpen] = useState(true);
  const entries = useEntries();

  return (
    <div className="sticky top-0 flex h-dvh flex-col py-3 lg:px-4">
      <a href="#/" className="mb-3 flex h-12 items-center gap-2 px-3 max-lg:justify-center max-lg:px-0" aria-label="울림 홈">
        <Logo />
        <span className="text-[20px] font-[650] tracking-tight max-lg:hidden">울림</span>
      </a>

      <nav aria-label="메뉴" className="flex flex-col gap-0.5 max-lg:items-center">
        {entries.map((entry) => {
          const current = isCurrent(entry, route, me.handle);
          return (
            <a
              key={entry.key}
              href={entry.href}
              aria-current={current ? "page" : undefined}
              aria-label={entry.label}
              className={`relative flex h-11 items-center gap-3 rounded-md px-3 text-[16px] transition-colors duration-150 max-lg:size-12 max-lg:justify-center max-lg:px-0 ${
                current ? "bg-[var(--hover)] font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="relative">
                {entry.icon(current)}
                {entry.key === "notifications" && <Badge count={unread} />}
              </span>
              <span className="max-lg:hidden">{entry.label}</span>
            </a>
          );
        })}
      </nav>

      <section className="mt-7 max-lg:hidden">
        <button
          type="button"
          aria-expanded={topicsOpen}
          onClick={() => setTopicsOpen((open) => !open)}
          className="flex h-8 w-full items-center justify-between rounded-md px-3 text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          팔로우한 주제
          <motion.span animate={{ rotate: topicsOpen ? 0 : -90 }} transition={{ duration: 0.2, ease: easeOutCubic }}>
            <ChevronIcon size={16} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {topicsOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: easeOutCubic }}
              className="overflow-hidden"
            >
              {followedTopics.map((tag) => (
                <li key={tag}>
                  <a
                    href={href({ name: "explore", q: `#${tag}` })}
                    className="flex h-9 items-center rounded-md px-3 text-[15px] text-[var(--ink)] hover:bg-[var(--hover)]"
                  >
                    #{tag}
                  </a>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </section>

      <motion.button
        type="button"
        whileTap={press}
        onClick={() => openComposer()}
        aria-label="글쓰기"
        className="mt-6 flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--ink)] text-[14px] font-semibold text-[var(--surface)] transition-[filter] duration-150 hover:brightness-[0.88] max-lg:mx-auto max-lg:size-12"
      >
        <PenIcon size={18} />
        <span className="max-lg:hidden">글쓰기</span>
      </motion.button>

      <a
        href={href({ name: "profile", handle: me.handle, tab: "posts" })}
        className="mt-auto flex items-center gap-3 rounded-md p-2 hover:bg-[var(--hover)] max-lg:justify-center"
        aria-label="내 프로필"
      >
        <Avatar user={me} size={38} />
        <span className="min-w-0 max-lg:hidden">
          <span className="block truncate text-[15px] font-[650]">{me.name}</span>
          <span className="block truncate text-[14px] text-[var(--muted)]">@{me.handle}</span>
        </span>
      </a>
    </div>
  );
}

export function MobileTabBar({ route }: { route: Route }) {
  const { state, openComposer } = useApp();
  const me = state.users[meId];
  const unread = unreadNotifications(state);
  const entries = useEntries();

  return (
    <>
      <motion.button
        type="button"
        whileTap={press}
        aria-label="글쓰기"
        onClick={() => openComposer()}
        className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-lg bg-[var(--ink)] text-[var(--surface)] shadow-[var(--shadow)] md:hidden"
      >
        <PenIcon size={22} />
      </motion.button>
      <nav
        aria-label="메뉴"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {entries.map((entry) => {
          const current = isCurrent(entry, route, me.handle);
          return (
            <a
              key={entry.key}
              href={entry.href}
              aria-label={entry.label}
              aria-current={current ? "page" : undefined}
              className={`grid h-14 flex-1 place-items-center ${current ? "text-[var(--ink)]" : "text-[var(--faint)]"}`}
            >
              <span className="relative">
                {entry.icon(current)}
                {entry.key === "notifications" && <Badge count={unread} />}
              </span>
            </a>
          );
        })}
      </nav>
    </>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2, ease: easeOutCubic }}
          className="absolute -top-1.5 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-[var(--surface)] dark:text-[#06201c]"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  // 동심원 세 겹: 말이 퍼져 나가는 울림.
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="4" fill="var(--accent)" />
      <circle cx="14" cy="14" r="8.5" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.55" />
      <circle cx="14" cy="14" r="12.5" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.25" />
    </svg>
  );
}
