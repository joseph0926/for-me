import type { ComponentType } from "react";

import { useApp } from "../context";
import { ME, liveNow } from "../data";
import type { Route } from "../router";
import { creatorById } from "../store";
import { CreatorAvatar, FanAvatar } from "./Avatar";
import { BellIcon, CompassIcon, HomeIcon, UserIcon } from "./Icons";
import { creatorAccent } from "./tone";

export type NavId = "home" | "explore" | "alerts" | "me";

export const NAV_ITEMS: { id: NavId; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "explore", label: "탐색", Icon: CompassIcon },
  { id: "alerts", label: "알림", Icon: BellIcon },
  { id: "me", label: "나", Icon: UserIcon },
];

// 크리에이터 홈을 마지막으로 연 뒤 올라온 크리에이터 글 수
export function useNewCounts(): Record<string, number> {
  const { state } = useApp();
  const counts: Record<string, number> = {};
  for (const creatorId of state.subscriptions) {
    const visited = state.lastVisited[creatorId] ?? 0;
    counts[creatorId] = state.posts.filter(
      (post) => post.creatorId === creatorId && post.author.kind === "creator" && post.createdAt > visited,
    ).length;
  }
  return counts;
}

export function Sidebar({ active, unread, current }: { active: NavId | null; unread: number; current: Route }) {
  const { state, go } = useApp();
  const newCounts = useNewCounts();
  const memberships = Object.keys(state.memberships).length;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <button type="button" onClick={() => go({ name: "home" })} className="px-6 pb-4 pt-6 text-left text-[24px] font-extrabold tracking-[-0.04em]">
        소곤
      </button>
      <button
        type="button"
        onClick={() => go({ name: "me" })}
        className="mx-3 flex items-center gap-2.5 rounded-xl bg-sunken px-3 py-2.5 text-left"
      >
        <FanAvatar fan={ME} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{ME.name}</span>
          <span className="block text-[12px] text-muted">
            구독 {state.subscriptions.length} · 멤버십 {memberships}
          </span>
        </span>
      </button>

      <nav className="mt-3 flex flex-col px-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => go({ name: id })}
            aria-current={active === id ? "page" : undefined}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] ${
              active === id ? "bg-sunken font-semibold text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink"
            }`}
          >
            <Icon size={21} />
            {label}
            {id === "alerts" && unread > 0 && (
              <span className="ml-auto min-w-5 rounded-full bg-live px-1.5 text-center text-[11px] font-bold leading-5 text-white">{unread}</span>
            )}
          </button>
        ))}
      </nav>

      <p className="mt-6 px-6 text-[12px] font-semibold text-muted">구독 중</p>
      <ul className="mt-1.5 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {state.subscriptions.map((creatorId) => {
          const creator = creatorById(creatorId);
          const isLive = liveNow.creatorId === creator.id;
          const selected = current.name === "creator" && current.creatorId === creator.id;
          return (
            <li key={creator.id}>
              <button
                type="button"
                onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })}
                aria-current={selected ? "page" : undefined}
                className={`flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] ${selected ? "bg-sunken font-semibold" : "hover:bg-sunken/60"}`}
              >
                <CreatorAvatar creator={creator} size={26} />
                <span className="min-w-0 flex-1 truncate">{creator.name}</span>
                {isLive ? (
                  <span className="rounded bg-live px-1 text-[10px] font-extrabold leading-4 text-white">LIVE</span>
                ) : (
                  newCounts[creator.id] > 0 && (
                    <span
                      className="min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white"
                      style={{ background: creatorAccent(creator.hue) }}
                      aria-label={`새 글 ${newCounts[creator.id]}개`}
                    >
                      {newCounts[creator.id]}
                    </span>
                  )
                )}
              </button>
            </li>
          );
        })}
        {state.subscriptions.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">구독한 크리에이터가 없어요</li>}
      </ul>
    </aside>
  );
}
