import { useState } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { PlusIcon } from "../components/Icons";
import { PostCard } from "../components/PostCard";
import { Scene } from "../components/Scene";
import { useApp } from "../context";
import { liveNow } from "../data";
import { compactCount, elapsedLabel } from "../format";
import { canView, creatorById, hasNewFrom } from "../store";

type Filter = "all" | "viewable";

export function HomeScreen() {
  const { state, now, open, openLive, selectTab } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const subscribed = state.subscriptions.map(creatorById);
  const liveCreator = state.subscriptions.includes(liveNow.creatorId) ? creatorById(liveNow.creatorId) : null;

  const creatorPosts = state.posts
    .filter((post) => post.author.kind === "creator" && state.subscriptions.includes(post.creatorId))
    .sort((a, b) => b.createdAt - a.createdAt);
  const visiblePosts = filter === "all" ? creatorPosts : creatorPosts.filter((post) => canView(state, post));

  return (
    <div className="h-full overflow-y-auto bg-sunken">
      <header className="flex h-13 items-center bg-surface px-4">
        <span className="text-[21px] font-extrabold tracking-[-0.04em]">소곤</span>
      </header>

      <section className="bg-surface pb-3">
        <div className="flex items-baseline justify-between px-4 pt-1">
          <h2 className="text-[14px] font-semibold">
            내 크리에이터 <span className="text-muted">{subscribed.length}</span>
          </h2>
          <button type="button" onClick={() => selectTab("me")} className="text-[12.5px] text-muted">
            모두보기
          </button>
        </div>
        <ul className="no-scrollbar mt-2.5 flex gap-3.5 overflow-x-auto px-4">
          {subscribed.map((creator) => {
            const isLive = creator.id === liveNow.creatorId;
            const ring = isLive ? "live" : hasNewFrom(state, creator.id) ? "new" : undefined;
            return (
              <li key={creator.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => (isLive ? openLive(creator.id) : open({ name: "creator", creatorId: creator.id, section: "from" }))}
                  className="relative flex w-[62px] flex-col items-center gap-1.5 pt-1"
                >
                  <CreatorAvatar creator={creator} size={54} ring={ring} />
                  {isLive && (
                    <span className="absolute top-[46px] rounded bg-live px-1 text-[9.5px] font-extrabold leading-[15px] text-white">
                      LIVE
                    </span>
                  )}
                  <span className="w-full truncate text-center text-[12px]">{creator.callName}</span>
                </button>
              </li>
            );
          })}
          <li className="shrink-0">
            <button type="button" onClick={() => selectTab("explore")} className="flex w-[62px] flex-col items-center gap-1.5 pt-1">
              <span className="grid size-[54px] place-items-center rounded-full border border-dashed border-muted/60 text-muted">
                <PlusIcon size={22} />
              </span>
              <span className="text-[12px] text-muted">찾아보기</span>
            </button>
          </li>
        </ul>
      </section>

      {liveCreator && (
        <button
          type="button"
          onClick={() => openLive(liveCreator.id)}
          className="mx-4 mt-2.5 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl bg-surface p-2 text-left"
        >
          <Scene motif="stage" hue={liveCreator.hue} className="h-16 w-16 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-live">
              <span className="size-1.5 animate-pulse rounded-full bg-live" />
              {liveCreator.name} 라이브 · {elapsedLabel(liveNow.startedAt, now)}
            </span>
            <span className="mt-0.5 block truncate text-[14.5px] font-semibold">{liveNow.title}</span>
            <span className="text-[12px] text-muted">{compactCount(liveNow.viewers)}명 시청 중</span>
          </span>
        </button>
      )}

      <section className="mt-2.5">
        <div className="flex items-center gap-2 bg-surface px-4 pb-1 pt-3.5">
          <h2 className="mr-auto text-[15px] font-bold">최신 소식</h2>
          {(["all", "viewable"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${
                filter === value ? "bg-ink text-surface" : "bg-sunken text-muted"
              }`}
            >
              {value === "all" ? "전체" : "열람 가능"}
            </button>
          ))}
        </div>
        {visiblePosts.length === 0 ? (
          <EmptyFeed hasSubscriptions={subscribed.length > 0} onExplore={() => selectTab("explore")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {visiblePosts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} showSpace={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyFeed({ hasSubscriptions, onExplore }: { hasSubscriptions: boolean; onExplore: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 bg-surface px-6 py-14 text-center">
      <p className="text-[14px] text-muted">
        {hasSubscriptions ? "지금 볼 수 있는 글이 없어요" : "구독한 크리에이터가 아직 없어요"}
      </p>
      {!hasSubscriptions && (
        <button type="button" onClick={onExplore} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface">
          크리에이터 찾아보기
        </button>
      )}
    </div>
  );
}
