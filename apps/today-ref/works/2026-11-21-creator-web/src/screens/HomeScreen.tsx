import { useState } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { PlusIcon } from "../components/Icons";
import { FeedCard } from "../components/PostCards";
import { Scene } from "../components/Scene";
import { useNewCounts } from "../components/Sidebar";
import { useApp } from "../context";
import { liveNow } from "../data";
import { compactCount, elapsedLabel } from "../format";
import { canView, creatorById } from "../store";

type Filter = "all" | "viewable";

export function HomeScreen() {
  const { state, now, go } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const newCounts = useNewCounts();
  const subscribed = state.subscriptions.map(creatorById);
  const liveCreator = state.subscriptions.includes(liveNow.creatorId) ? creatorById(liveNow.creatorId) : null;

  const creatorPosts = state.posts
    .filter((post) => post.author.kind === "creator" && state.subscriptions.includes(post.creatorId))
    .sort((a, b) => b.createdAt - a.createdAt);
  const visiblePosts = filter === "all" ? creatorPosts : creatorPosts.filter((post) => canView(state, post));

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-5 md:px-6 md:pb-10">
      {/* 넓은 화면에서는 왼쪽 메뉴가 구독 목록을 보여 준다. */}
      <ul className="no-scrollbar -mx-4 mb-4 flex gap-3.5 overflow-x-auto px-4 md:hidden">
        {subscribed.map((creator) => {
          const isLive = creator.id === liveNow.creatorId;
          return (
            <li key={creator.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(isLive ? { name: "live", creatorId: creator.id } : { name: "creator", creatorId: creator.id, tab: "home" })}
                className="relative flex w-[62px] flex-col items-center gap-1.5 pt-1"
              >
                <CreatorAvatar creator={creator} size={54} ring={isLive ? "live" : newCounts[creator.id] > 0 ? "new" : undefined} />
                {isLive && (
                  <span className="absolute top-[46px] rounded bg-live px-1 text-[9.5px] font-extrabold leading-[15px] text-white">LIVE</span>
                )}
                <span className="w-full truncate text-center text-[12px]">{creator.callName}</span>
              </button>
            </li>
          );
        })}
        <li className="shrink-0">
          <button type="button" onClick={() => go({ name: "explore" })} className="flex w-[62px] flex-col items-center gap-1.5 pt-1">
            <span className="grid size-[54px] place-items-center rounded-full border border-dashed border-muted/60 text-muted">
              <PlusIcon size={22} />
            </span>
            <span className="text-[12px] text-muted">찾아보기</span>
          </button>
        </li>
      </ul>

      {liveCreator && (
        <button
          type="button"
          onClick={() => go({ name: "live", creatorId: liveCreator.id })}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-line p-2 text-left xl:hidden"
        >
          <Scene motif="stage" hue={liveCreator.hue} className="h-16 w-24 shrink-0 rounded-xl" />
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

      <div className="mb-3 flex items-center gap-2">
        <h1 className="mr-auto text-[20px] font-bold">최신 소식</h1>
        {(["all", "viewable"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filter === value ? "bg-ink text-surface" : "bg-sunken text-muted"}`}
          >
            {value === "all" ? "전체" : "열람 가능"}
          </button>
        ))}
      </div>

      {visiblePosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line px-6 py-14 text-center">
          <p className="text-[14px] text-muted">{subscribed.length > 0 ? "지금 볼 수 있는 글이 없어요" : "구독한 크리에이터가 아직 없어요"}</p>
          {subscribed.length === 0 && (
            <button type="button" onClick={() => go({ name: "explore" })} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface">
              크리에이터 찾아보기
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiblePosts.map((post) => (
            <li key={post.id}>
              <FeedCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
