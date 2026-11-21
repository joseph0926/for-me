import { useState } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { ChevronIcon } from "../components/Icons";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { ME, tiersFor } from "../data";
import { relativeTime, won } from "../format";
import { commentsOf, creatorById, isMine } from "../store";

export function MeScreen() {
  const { state, dispatch, now, open, showToast } = useApp();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const memberships = Object.entries(state.memberships).map(([creatorId, tierId]) => {
    const creator = creatorById(creatorId);
    const tier = tiersFor(creator).find((item) => item.id === tierId);
    if (!tier) throw new Error(`${creatorId}의 등급 ${tierId}가 없습니다`);
    return { creator, tier };
  });
  const myPosts = state.posts.filter(isMine).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full overflow-y-auto bg-sunken">
      <header className="flex items-center gap-3 bg-surface px-4 pb-4 pt-4">
        <FanAvatar fan={ME} size={56} />
        <div>
          <p className="text-[18px] font-bold">{ME.name}</p>
          <p className="text-[12.5px] text-muted">
            구독 {state.subscriptions.length} · 멤버십 {memberships.length}
          </p>
        </div>
      </header>

      <section className="mt-2 bg-surface px-4 py-4">
        <h2 className="text-[14px] font-bold">멤버십</h2>
        {memberships.length === 0 && <p className="py-4 text-[13.5px] text-muted">가입한 멤버십이 없어요</p>}
        <ul className="mt-2 flex flex-col gap-2">
          {memberships.map(({ creator, tier }) => (
            <li key={creator.id} className="rounded-2xl bg-sunken p-3.5">
              <div className="flex items-center gap-3">
                <CreatorAvatar creator={creator} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{creator.name}</p>
                  <p className="text-[12.5px]" style={{ color: creatorAccent(creator.hue) }}>
                    {tier.name} · {won(tier.monthlyPrice)}/월
                  </p>
                </div>
                {cancelling !== creator.id && (
                  <button type="button" onClick={() => setCancelling(creator.id)} className="text-[12.5px] text-muted underline">
                    해지
                  </button>
                )}
              </div>
              {cancelling === creator.id && (
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <p className="flex-1 text-[12.5px] leading-snug">해지하면 멤버 전용 글을 볼 수 없어요. 구독은 유지돼요.</p>
                  <button type="button" onClick={() => setCancelling(null)} className="h-8 rounded-lg px-3 text-[12.5px] text-muted">
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "cancelMembership", creatorId: creator.id });
                      setCancelling(null);
                      showToast(`${creator.name} ${tier.name}를 해지했어요`);
                    }}
                    className="h-8 rounded-lg bg-ink px-3 text-[12.5px] font-semibold text-surface"
                  >
                    해지하기
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-2 bg-surface py-3">
        <h2 className="px-4 pb-1 text-[14px] font-bold">구독 중인 크리에이터</h2>
        {state.subscriptions.length === 0 && <p className="px-4 py-4 text-[13.5px] text-muted">구독한 크리에이터가 없어요</p>}
        <ul>
          {state.subscriptions.map((creatorId) => {
            const creator = creatorById(creatorId);
            return (
              <li key={creator.id}>
                <button
                  type="button"
                  onClick={() => open({ name: "creator", creatorId: creator.id, section: "from" })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                >
                  <CreatorAvatar creator={creator} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{creator.name}</span>
                    <span className="block text-[12px] text-muted">{creator.role}</span>
                  </span>
                  <ChevronIcon size={18} className="text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-2 bg-surface py-3">
        <h2 className="px-4 pb-1 text-[14px] font-bold">내가 쓴 팬 글</h2>
        {myPosts.length === 0 && <p className="px-4 py-4 text-[13.5px] text-muted">아직 쓴 팬 글이 없어요</p>}
        <ul>
          {myPosts.map((post) => {
            const creator = creatorById(post.creatorId);
            const replied = commentsOf(state, post.id).some((comment) => comment.author.kind === "creator");
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => open({ name: "post", postId: post.id, focusComment: false })}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left"
                >
                  <span className="text-[12px] text-muted">
                    To. {creator.callName} · {relativeTime(post.createdAt, now)}
                    {replied && (
                      <span className="ml-1.5 font-semibold" style={{ color: creatorAccent(creator.hue) }}>
                        크리에이터 댓글 도착
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[14px]">{post.body}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
