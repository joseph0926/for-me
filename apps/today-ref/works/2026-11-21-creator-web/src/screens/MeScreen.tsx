import { useState } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { ChevronIcon } from "../components/Icons";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { ME, tiersFor } from "../data";
import { relativeTime, won } from "../format";
import { commentsOf, creatorById, isMine } from "../store";

export function MeScreen() {
  const { state, dispatch, now, go, showToast } = useApp();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const memberships = Object.entries(state.memberships).map(([creatorId, tierId]) => {
    const creator = creatorById(creatorId);
    const tier = tiersFor(creator).find((item) => item.id === tierId);
    if (!tier) throw new Error(`${creatorId}의 등급 ${tierId}가 없습니다`);
    return { creator, tier };
  });
  const myPosts = state.posts.filter(isMine).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-6 md:px-8 md:pb-12">
      <header className="flex items-center gap-4">
        <FanAvatar fan={ME} size={64} />
        <div>
          <h1 className="text-[22px] font-bold">{ME.name}</h1>
          <p className="text-[13px] text-muted">
            구독 {state.subscriptions.length} · 멤버십 {memberships.length}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[16px] font-bold">멤버십</h2>
          {memberships.length === 0 && <p className="py-4 text-[14px] text-muted">가입한 멤버십이 없어요</p>}
          <ul className="mt-3 flex flex-col gap-2">
            {memberships.map(({ creator, tier }) => (
              <li key={creator.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <CreatorAvatar creator={creator} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">{creator.name}</p>
                    <p className="text-[13px]" style={{ color: creatorAccent(creator.hue) }}>
                      {tier.name} · {won(tier.monthlyPrice)}/월
                    </p>
                  </div>
                  {cancelling !== creator.id && (
                    <button type="button" onClick={() => setCancelling(creator.id)} className="rounded-full px-3 py-1.5 text-[13px] text-muted hover:bg-sunken">
                      해지
                    </button>
                  )}
                </div>
                {cancelling === creator.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <p className="min-w-[180px] flex-1 text-[13px] leading-snug">해지하면 멤버 전용 글을 볼 수 없어요. 구독은 유지돼요.</p>
                    <button type="button" onClick={() => setCancelling(null)} className="h-9 rounded-lg px-3 text-[13px] text-muted hover:bg-sunken">
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: "cancelMembership", creatorId: creator.id });
                        setCancelling(null);
                        showToast(`${creator.name} ${tier.name}를 해지했어요`);
                      }}
                      className="h-9 rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-surface"
                    >
                      해지하기
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-bold">구독 중인 크리에이터</h2>
          {state.subscriptions.length === 0 && <p className="py-4 text-[14px] text-muted">구독한 크리에이터가 없어요</p>}
          <ul className="mt-2">
            {state.subscriptions.map((creatorId) => {
              const creator = creatorById(creatorId);
              return (
                <li key={creator.id}>
                  <button
                    type="button"
                    onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-sunken"
                  >
                    <CreatorAvatar creator={creator} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium">{creator.name}</span>
                      <span className="block text-[12.5px] text-muted">{creator.role}</span>
                    </span>
                    <ChevronIcon size={18} className="text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-[16px] font-bold">내가 쓴 팬 글</h2>
        {myPosts.length === 0 && <p className="py-4 text-[14px] text-muted">아직 쓴 팬 글이 없어요</p>}
        <ul className="mt-2 divide-y divide-line">
          {myPosts.map((post) => {
            const creator = creatorById(post.creatorId);
            const replied = commentsOf(state, post.id).some((comment) => comment.author.kind === "creator");
            return (
              <li key={post.id}>
                <button type="button" onClick={() => go({ name: "post", postId: post.id })} className="flex w-full flex-col gap-0.5 py-3 text-left">
                  <span className="text-[12.5px] text-muted">
                    To. {creator.callName} · {relativeTime(post.createdAt, now)}
                    {replied && (
                      <span className="ml-1.5 font-semibold" style={{ color: creatorAccent(creator.hue) }}>
                        크리에이터 댓글 도착
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[14.5px]">{post.body}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
