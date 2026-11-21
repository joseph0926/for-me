import { useState } from "react";

import { SearchIcon } from "../components/Icons";
import { Scene } from "../components/Scene";
import { useApp } from "../context";
import { creators, liveNow } from "../data";
import { compactCount } from "../format";

export function ExploreScreen() {
  const { state, dispatch, open, showToast } = useApp();
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const results = creators.filter(
    (creator) => keyword === "" || creator.name.includes(keyword) || creator.role.includes(keyword) || creator.bio.includes(keyword),
  );

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <header className="px-4 pb-2 pt-3">
        <h1 className="text-[21px] font-extrabold tracking-[-0.03em]">탐색</h1>
        <label className="mt-3 flex h-10 items-center gap-2 rounded-xl bg-sunken px-3 text-muted">
          <SearchIcon size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="크리에이터, 분야 검색"
            aria-label="크리에이터 검색"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
        </label>
      </header>
      <ul className="flex flex-col gap-3 px-4 pb-6 pt-2">
        {results.map((creator) => {
          const subscribed = state.subscriptions.includes(creator.id);
          const paid = Boolean(state.memberships[creator.id]);
          return (
            <li key={creator.id} className="overflow-hidden rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => open({ name: "creator", creatorId: creator.id, section: "from" })}
                className="relative block h-28 w-full text-left text-white"
              >
                <Scene motif={creator.motif} hue={creator.hue} className="absolute inset-0" />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgb(0_0_0/0.6))]" />
                {liveNow.creatorId === creator.id && (
                  <span className="absolute left-3 top-3 rounded bg-live px-1.5 text-[11px] font-extrabold leading-[18px]">LIVE</span>
                )}
                <span className="absolute bottom-2.5 left-3.5 text-[19px] font-bold">{creator.name}</span>
              </button>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px]">{creator.bio}</p>
                  <p className="text-[12px] text-muted">
                    {creator.role} · 팔로워 {compactCount(creator.followers + (subscribed ? 1 : 0))}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={paid}
                  onClick={() => {
                    dispatch({ type: "toggleSubscribe", creatorId: creator.id });
                    showToast(subscribed ? `${creator.name} 구독을 취소했어요` : `${creator.name} 님을 구독했어요`);
                  }}
                  aria-pressed={subscribed}
                  className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold ${
                    subscribed ? "bg-sunken text-muted" : "bg-ink text-surface"
                  }`}
                >
                  {paid ? "멤버" : subscribed ? "구독 중" : "구독"}
                </button>
              </div>
            </li>
          );
        })}
        {results.length === 0 && <li className="py-14 text-center text-[14px] text-muted">'{keyword}'에 맞는 크리에이터가 없어요</li>}
      </ul>
    </div>
  );
}
