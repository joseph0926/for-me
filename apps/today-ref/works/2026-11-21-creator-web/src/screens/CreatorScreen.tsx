import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { BellIcon, CheckIcon, ChevronIcon, LockIcon, PenIcon } from "../components/Icons";
import { FeedCard, GridCard, visibilityLabel } from "../components/PostCards";
import { Scene } from "../components/Scene";
import { creatorAccent, creatorSoft } from "../components/tone";
import { useApp } from "../context";
import { ME, TIER_ORDER, liveNow, notices, scheduleEvents, tiersFor, type Creator, type EventKind, type Post, type TierId } from "../data";
import { compactCount, relativeTime, scheduleDate, won } from "../format";
import type { CreatorTab } from "../router";
import { canView, creatorById, tierOf } from "../store";

const DAY_MS = 24 * 60 * 60 * 1000;

export function CreatorScreen({ creatorId, tab }: { creatorId: string; tab: CreatorTab }) {
  const { state, dispatch, now, go, showToast } = useApp();
  const creator = creatorById(creatorId);
  const tier = tierOf(state, creator.id);
  const isPaid = tier === "member" || tier === "close";
  const isLive = liveNow.creatorId === creator.id;
  const accent = creatorAccent(creator.hue);
  const creatorPosts = state.posts
    .filter((post) => post.creatorId === creator.id && post.author.kind === "creator")
    .sort((a, b) => b.createdAt - a.createdAt);
  const todayFanPosts = state.posts.filter(
    (post) => post.creatorId === creator.id && post.author.kind === "fan" && now - post.createdAt < DAY_MS,
  ).length;
  const scheduleUnseen = !state.scheduleSeen.includes(creator.id);
  const paidTierName = isPaid ? tiersFor(creator).find((item) => item.id === tier)?.name : null;

  const tabs: { id: CreatorTab; label: string; badge?: number; dot?: boolean }[] = [
    { id: "home", label: "홈" },
    { id: "posts", label: "포스트" },
    { id: "fans", label: "팬 글", badge: todayFanPosts },
    { id: "schedule", label: "일정", dot: scheduleUnseen },
    { id: "membership", label: "멤버십" },
  ];

  return (
    <div className="pb-24 md:pb-12">
      <div className="relative h-44 overflow-hidden sm:h-60 lg:h-72">
        <Scene motif={creator.motif} hue={creator.hue} className="absolute inset-0" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgb(0_0_0/0.35))]" />
        {isLive && (
          <button
            type="button"
            onClick={() => go({ name: "live", creatorId: creator.id })}
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-live py-1.5 pl-2.5 pr-3 text-[12.5px] font-bold text-white"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            라이브 중 · 보러 가기
          </button>
        )}
      </div>

      <div className="mx-auto max-w-[1040px] px-4 md:px-8">
        <span className="relative -mt-14 inline-block rounded-full bg-surface p-1.5">
          <CreatorAvatar creator={creator} size={104} />
        </span>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">{creator.name}</h1>
            <p className="mt-1 text-[14px] text-muted">
              {creator.role} · 팔로워 {compactCount(creator.followers + (tier ? 1 : 0))} · {creator.bio}
            </p>
          </div>
          <div className="flex gap-2">
            {isPaid ? (
              <span className="flex h-10 items-center rounded-full bg-sunken px-4 text-[13.5px] font-semibold text-muted">구독 중</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "toggleSubscribe", creatorId: creator.id });
                  showToast(tier ? `${creator.name} 구독을 취소했어요` : `${creator.name} 님을 구독했어요`);
                }}
                aria-pressed={tier === "follow"}
                className={`h-10 rounded-full px-5 text-[13.5px] font-semibold ${tier ? "bg-sunken text-muted" : "bg-ink text-surface"}`}
              >
                {tier ? "구독 중" : "구독하기"}
              </button>
            )}
            <button
              type="button"
              onClick={() => go({ name: "creator", creatorId: creator.id, tab: "membership" })}
              className="h-10 rounded-full px-5 text-[13.5px] font-semibold text-white"
              style={{ background: accent }}
            >
              {paidTierName ? `${paidTierName} 이용 중` : "멤버십 가입"}
            </button>
          </div>
        </div>

        <nav className="no-scrollbar mt-6 flex gap-6 overflow-x-auto border-b border-line" aria-label={`${creator.name} 메뉴`}>
          {tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go({ name: "creator", creatorId: creator.id, tab: item.id })}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-12 shrink-0 items-center gap-1.5 text-[15px] ${active ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full px-1.5 text-[11px] font-bold leading-[18px] text-white" style={{ background: accent }}>
                    {item.badge}
                  </span>
                )}
                {item.dot && <span className="size-1.5 rounded-full bg-live" aria-label="새 일정" />}
                {active && <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-ink" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === "home" && <HomeTab creator={creator} posts={creatorPosts} />}
          {tab === "posts" && (
            <section>
              <p className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
                포스트 {creatorPosts.length}개
                {creatorPosts.some((post) => !canView(state, post)) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <LockIcon size={13} /> 잠긴 글 {creatorPosts.filter((post) => !canView(state, post)).length}개
                  </>
                )}
              </p>
              <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                {creatorPosts.map((post) => (
                  <GridCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
          {tab === "fans" && <FansTab creator={creator} />}
          {tab === "schedule" && <ScheduleTab creator={creator} />}
          {tab === "membership" && <MembershipTab creator={creator} />}
        </div>
      </div>
    </div>
  );
}

function HomeTab({ creator, posts }: { creator: Creator; posts: Post[] }) {
  const { go } = useApp();
  const accent = creatorAccent(creator.hue);
  const [featured, ...rest] = posts;
  const creatorNotices = notices.filter((notice) => notice.creatorId === creator.id);

  return (
    <div className="flex flex-col gap-10">
      <button
        type="button"
        onClick={() => go({ name: "creator", creatorId: creator.id, tab: "schedule" })}
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[14px]"
        style={{ background: creatorSoft(creator.hue) }}
      >
        <span className="font-bold" style={{ color: accent }}>
          D-{creator.anniversary.daysLeft}
        </span>
        <span className="flex-1 truncate">{creator.anniversary.label}</span>
        <ChevronIcon size={16} className="text-muted" />
      </button>

      {featured && (
        <section>
          <h2 className="mb-3 text-[18px] font-bold">최신 포스트</h2>
          <FeaturedPost creator={creator} post={featured} />
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[18px] font-bold">지난 포스트</h2>
            <button
              type="button"
              onClick={() => go({ name: "creator", creatorId: creator.id, tab: "posts" })}
              className="text-[13px] text-muted hover:text-ink"
            >
              모두 보기
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 3).map((post) => (
              <GridCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {creatorNotices.length > 0 && (
        <section>
          <h2 className="mb-3 text-[18px] font-bold">공지</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {creatorNotices.map((notice, index) => (
              <li key={notice.id} className="flex items-center gap-3 px-4 py-3.5">
                {index === 0 && (
                  <span className="rounded px-1.5 text-[11px] font-bold leading-[18px] text-white" style={{ background: accent }}>
                    고정
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[14.5px]">{notice.title}</span>
                <span className="shrink-0 text-[12.5px] text-muted">{notice.postedOn}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FeaturedPost({ creator, post }: { creator: Creator; post: Post }) {
  const { state, now, go } = useApp();
  const unlocked = canView(state, post);
  return (
    <button
      type="button"
      onClick={() => go(unlocked ? { name: "post", postId: post.id } : { name: "creator", creatorId: creator.id, tab: "membership" })}
      className="grid w-full gap-5 text-left md:grid-cols-[1.15fr_1fr] md:items-center"
    >
      <span className="relative block overflow-hidden rounded-2xl">
        <Scene motif={post.scene ?? creator.motif} hue={creator.hue} className={`aspect-[16/10] w-full ${unlocked ? "" : "blur-md"}`} />
        {!unlocked && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">
            <LockIcon size={12} /> {visibilityLabel[post.visibility]}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-2">
        <span className="line-clamp-2 text-[20px] font-bold leading-snug">{post.body.split(/[.!?]/)[0]}</span>
        <span className={`line-clamp-3 text-[14.5px] leading-[1.6] text-muted ${unlocked ? "" : "blur-sm"}`}>{post.body}</span>
        <span className="text-[12.5px] text-muted">
          {relativeTime(post.createdAt, now)} · 조회 {compactCount(post.views)}
        </span>
      </span>
    </button>
  );
}

function FansTab({ creator }: { creator: Creator }) {
  const { state, openCompose } = useApp();
  const posts = state.posts
    .filter((post) => post.creatorId === creator.id && post.author.kind === "fan")
    .sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-3">
      <button
        type="button"
        onClick={() => openCompose(creator.id)}
        className="flex items-center gap-3 rounded-2xl border border-line px-5 py-4 text-left hover:bg-sunken/50"
      >
        <FanAvatar fan={ME} size={36} />
        <span className="flex-1 text-[14.5px] text-muted">To. {creator.callName}에게 한마디</span>
        <PenIcon size={19} className="text-muted" />
      </button>
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </div>
  );
}

const kindLabel: Record<EventKind, string> = { live: "라이브", release: "발매", show: "공연" };

function ScheduleTab({ creator }: { creator: Creator }) {
  const { state, dispatch, showToast } = useApp();
  const items = scheduleEvents
    .filter((event) => event.creatorId === creator.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return (
    <ul className="mx-auto max-w-[680px] divide-y divide-line">
      {items.map((event) => {
        const date = scheduleDate(event.date);
        const reminded = state.reminders.includes(event.id);
        return (
          <li key={event.id} className="flex items-center gap-4 py-4">
            <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-sunken py-2">
              <span className="text-[11px] text-muted">{date.month}</span>
              <span className="text-[20px] font-bold leading-tight">{date.day}</span>
              <span className="text-[11px] text-muted">{date.weekday}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[12px] font-semibold" style={{ color: creatorAccent(creator.hue) }}>
                {kindLabel[event.kind]} · {event.time}
              </span>
              <span className="mt-0.5 block text-[15.5px] font-medium">{event.title}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "toggleReminder", eventId: event.id });
                showToast(reminded ? "알림을 껐어요" : `${event.time} 30분 전에 알려 드릴게요`);
              }}
              aria-pressed={reminded}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ${reminded ? "bg-ink text-surface" : "bg-sunken text-muted"}`}
            >
              <BellIcon size={16} />
              {reminded ? "알림 켜짐" : "알림 받기"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MembershipTab({ creator }: { creator: Creator }) {
  const { state, openJoin } = useApp();
  const current = tierOf(state, creator.id);
  const isChange = current === "member" || current === "close";
  const accent = creatorAccent(creator.hue);

  const statusOf = (tierId: TierId): "current" | "included" | "available" => {
    if (current === null) return "available";
    if (tierId === current) return "current";
    return TIER_ORDER.indexOf(tierId) < TIER_ORDER.indexOf(current) ? "included" : "available";
  };

  return (
    <section>
      <h2 className="text-center text-[22px] font-bold">멤버십 선택</h2>
      <div className="mx-auto mt-6 grid max-w-[920px] gap-4 md:grid-cols-3 md:items-start">
        {tiersFor(creator).map((tier) => {
          const status = statusOf(tier.id);
          const recommended = tier.id === "member";
          const paidTierId = tier.id === "follow" ? null : tier.id;
          return (
            <article
              key={tier.id}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: recommended || status === "current" ? accent : "var(--line)", borderWidth: recommended ? 2 : 1 }}
            >
              {recommended && (
                <p className="py-1.5 text-center text-[12px] font-bold text-white" style={{ background: accent }}>
                  크리에이터 추천 등급
                </p>
              )}
              <div className="p-5">
                <h3 className="text-[17px] font-bold">{tier.name}</h3>
                <p className="mt-1 text-[24px] font-extrabold">
                  {tier.monthlyPrice === 0 ? "무료" : won(tier.monthlyPrice)}
                  {tier.monthlyPrice > 0 && <span className="text-[13px] font-medium text-muted"> / 월</span>}
                </p>
                {paidTierId ? (
                  <button
                    type="button"
                    disabled={status !== "available"}
                    onClick={() => openJoin(creator.id, paidTierId)}
                    className="mt-4 h-11 w-full rounded-xl text-[14px] font-semibold disabled:bg-sunken disabled:text-muted"
                    style={status === "available" ? { background: recommended ? accent : "var(--ink)", color: recommended ? "white" : "var(--surface)" } : undefined}
                  >
                    {status === "current" ? "이용 중" : status === "included" ? "현재 등급에 포함" : isChange ? "이 등급으로 변경" : "가입하기"}
                  </button>
                ) : (
                  <p className="mt-4 flex h-11 items-center justify-center rounded-xl bg-sunken text-[13.5px] text-muted">
                    {current ? "구독 중" : "구독하면 바로 이용"}
                  </p>
                )}
                <ul className="mt-4 flex flex-col gap-2">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-[13.5px]">
                      <CheckIcon size={16} style={{ color: accent }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
