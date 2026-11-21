import { useState } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { SearchIcon } from "../components/Icons";
import { Scene } from "../components/Scene";
import { useApp } from "../context";
import { creators, liveNow } from "../data";
import { compactCount } from "../format";

export function ExploreScreen() {
  const { state, dispatch, go, showToast } = useApp();
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const results = creators.filter(
    (creator) => keyword === "" || creator.name.includes(keyword) || creator.role.includes(keyword) || creator.bio.includes(keyword),
  );

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 md:px-8 md:pb-12">
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">탐색</h1>
      <label className="mt-4 flex h-12 max-w-[520px] items-center gap-2.5 rounded-xl bg-sunken px-4 text-muted">
        <SearchIcon size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="크리에이터, 분야 검색"
          aria-label="크리에이터 검색"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((creator) => {
          const subscribed = state.subscriptions.includes(creator.id);
          const paid = Boolean(state.memberships[creator.id]);
          return (
            <li key={creator.id} className="overflow-hidden rounded-2xl border border-line">
              <button type="button" onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })} className="relative block w-full text-left">
                <Scene motif={creator.motif} hue={creator.hue} className="aspect-[16/9] w-full" />
                {liveNow.creatorId === creator.id && (
                  <span className="absolute left-3 top-3 rounded bg-live px-1.5 text-[11px] font-extrabold leading-[18px] text-white">LIVE</span>
                )}
              </button>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <CreatorAvatar creator={creator} size={42} />
                <button
                  type="button"
                  onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[15px] font-bold">{creator.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {creator.role} · 팔로워 {compactCount(creator.followers + (subscribed ? 1 : 0))}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={paid}
                  onClick={() => {
                    dispatch({ type: "toggleSubscribe", creatorId: creator.id });
                    showToast(subscribed ? `${creator.name} 구독을 취소했어요` : `${creator.name} 님을 구독했어요`);
                  }}
                  aria-pressed={subscribed}
                  className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold ${subscribed ? "bg-sunken text-muted" : "bg-ink text-surface"}`}
                >
                  {paid ? "멤버" : subscribed ? "구독 중" : "구독"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {results.length === 0 && <p className="py-16 text-center text-[14px] text-muted">'{keyword}'에 맞는 크리에이터가 없어요</p>}
    </div>
  );
}
