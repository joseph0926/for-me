import { useState } from "react";

import { CreatorAvatar, FanAvatar } from "../components/Avatar";
import { BackIcon, BellIcon, CalendarIcon, ChevronIcon, LockIcon } from "../components/Icons";
import { PostCard } from "../components/PostCard";
import { Scene } from "../components/Scene";
import { creatorAccent, creatorSoft } from "../components/tone";
import { useApp } from "../context";
import { ME, liveNow, notices, scheduleEvents, tiersFor, type Creator, type EventKind } from "../data";
import { compactCount, scheduleDate } from "../format";
import type { CreatorSection } from "../navigation";
import { creatorById, tierOf } from "../store";

const DAY_MS = 24 * 60 * 60 * 1000;

export function CreatorScreen({ creatorId, initialSection }: { creatorId: string; initialSection: CreatorSection }) {
  const { state, dispatch, now, back, openLive, openMembership, showToast } = useApp();
  const creator = creatorById(creatorId);
  const [section, setSection] = useState(initialSection);
  const tier = tierOf(state, creator.id);
  const isLive = liveNow.creatorId === creator.id;
  const accent = creatorAccent(creator.hue);

  const fanPosts = state.posts.filter((post) => post.creatorId === creator.id && post.author.kind === "fan");
  const todayFanPosts = fanPosts.filter((post) => now - post.createdAt < DAY_MS).length;
  const scheduleUnseen = !state.scheduleSeen.includes(creator.id);

  const selectSection = (next: CreatorSection) => {
    setSection(next);
    if (next === "schedule") dispatch({ type: "seeSchedule", creatorId: creator.id });
  };

  const chips: { id: CreatorSection; label: string; dot?: boolean; count?: number }[] = [
    { id: "notice", label: "공지" },
    { id: "schedule", label: "일정", dot: scheduleUnseen },
    { id: "from", label: `From ${creator.callName}` },
    { id: "fans", label: "팬 글", count: todayFanPosts },
  ];

  return (
    <div className="h-full overflow-y-auto bg-sunken">
      <div className="relative h-[330px] overflow-hidden text-white">
        <Scene motif={creator.motif} hue={creator.hue} className="absolute inset-0" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35),transparent_28%,transparent_45%,rgb(0_0_0/0.72))]" />
        <div className="absolute inset-x-1.5 top-1.5 flex items-center">
          <button type="button" onClick={back} aria-label="뒤로" className="grid size-10 place-items-center rounded-full">
            <BackIcon />
          </button>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          {isLive && (
            <button
              type="button"
              onClick={() => openLive(creator.id)}
              className="mb-2 flex items-center gap-1.5 rounded-full bg-live py-1 pl-2 pr-2.5 text-[12px] font-bold"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-white" />
              라이브 중 · 보러 가기
            </button>
          )}
          <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.03em]">{creator.name}</h1>
          <p className="mt-0.5 text-[13px] text-white/80">
            {creator.role} · 팔로워 {compactCount(creator.followers + (tier ? 1 : 0))}
          </p>
        </div>
      </div>

      <div className="flex gap-2 bg-surface px-4 pt-3.5">
        {tier === "member" || tier === "close" ? (
          <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sunken text-[13.5px] font-semibold text-muted">
            구독 중
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "toggleSubscribe", creatorId: creator.id });
              showToast(tier ? `${creator.name} 구독을 취소했어요` : `${creator.name} 님을 구독했어요`);
            }}
            aria-pressed={tier === "follow"}
            className={`h-10 flex-1 rounded-xl text-[13.5px] font-semibold ${tier ? "bg-sunken text-muted" : "bg-ink text-surface"}`}
          >
            {tier ? "구독 중" : "구독하기"}
          </button>
        )}
        <button
          type="button"
          onClick={() => openMembership(creator.id)}
          className="h-10 flex-1 rounded-xl text-[13.5px] font-semibold"
          style={{ background: creatorSoft(creator.hue), color: accent }}
        >
          {tier === "member" || tier === "close" ? `${tiersFor(creator).find((item) => item.id === tier)?.name} 이용 중` : "멤버십 가입"}
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto bg-surface px-4 py-3">
        {chips.map((chip) => {
          const active = chip.id === section;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => selectSection(chip.id)}
              aria-pressed={active}
              className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-semibold ${
                active ? "bg-ink text-surface" : "bg-sunken text-ink"
              }`}
            >
              {chip.label}
              {chip.count !== undefined && chip.count > 0 && (
                <span className="rounded-full px-1.5 text-[11px] font-bold leading-[18px] text-white" style={{ background: accent }}>
                  {chip.count}
                </span>
              )}
              {chip.dot && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-live" aria-label="새 일정" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => selectSection("schedule")}
        className="flex w-full items-center gap-2 border-t border-line bg-surface px-4 py-3 text-left text-[13px]"
      >
        <span className="h-3.5 w-[3px] rounded-full" style={{ background: accent }} />
        <span className="font-semibold" style={{ color: accent }}>
          D-{creator.anniversary.daysLeft}
        </span>
        <span className="flex-1 truncate">{creator.anniversary.label}</span>
        <ChevronIcon size={16} className="text-muted" />
      </button>

      <div className="mt-2">
        {section === "notice" && <NoticeList creator={creator} />}
        {section === "schedule" && <ScheduleList creator={creator} />}
        {section === "from" && <FromList creator={creator} />}
        {section === "fans" && <FanList creator={creator} />}
      </div>
    </div>
  );
}

function NoticeList({ creator }: { creator: Creator }) {
  const items = notices.filter((notice) => notice.creatorId === creator.id);
  return (
    <ul className="flex flex-col gap-2 bg-surface p-4">
      {items.map((notice, index) => (
        <li
          key={notice.id}
          className="rounded-2xl p-4"
          style={
            index === 0
              ? { background: `linear-gradient(135deg, hsl(${creator.hue} 70% 50%), hsl(${creator.hue + 30} 60% 40%))`, color: "white" }
              : { background: "var(--sunken)" }
          }
        >
          <p className="text-[11.5px] font-semibold opacity-75">{index === 0 ? "고정 공지" : "공지"}</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">{notice.title}</p>
          <p className="mt-2 text-[12px] opacity-70">{notice.postedOn}</p>
        </li>
      ))}
    </ul>
  );
}

const kindLabel: Record<EventKind, string> = { live: "라이브", release: "발매", show: "공연" };

function ScheduleList({ creator }: { creator: Creator }) {
  const { state, dispatch, showToast } = useApp();
  const items = scheduleEvents
    .filter((event) => event.creatorId === creator.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <ul className="divide-y divide-line bg-surface px-4">
      {items.map((event) => {
        const date = scheduleDate(event.date);
        const reminded = state.reminders.includes(event.id);
        return (
          <li key={event.id} className="flex items-center gap-3.5 py-3.5">
            <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-sunken py-1.5">
              <span className="text-[10.5px] text-muted">{date.month}</span>
              <span className="text-[18px] font-bold leading-tight">{date.day}</span>
              <span className="text-[10.5px] text-muted">{date.weekday}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[11.5px] font-semibold" style={{ color: creatorAccent(creator.hue) }}>
                {kindLabel[event.kind]} · {event.time}
              </span>
              <span className="mt-0.5 block text-[14.5px] font-medium leading-snug">{event.title}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "toggleReminder", eventId: event.id });
                showToast(reminded ? "알림을 껐어요" : `${event.time} 30분 전에 알려 드릴게요`);
              }}
              aria-pressed={reminded}
              aria-label={reminded ? "알림 끄기" : "알림 받기"}
              className={`grid size-9 shrink-0 place-items-center rounded-full ${reminded ? "bg-ink text-surface" : "bg-sunken text-muted"}`}
            >
              <BellIcon size={18} />
            </button>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="flex items-center gap-2 py-10 text-[13.5px] text-muted">
          <CalendarIcon size={18} /> 예정된 일정이 없어요
        </li>
      )}
    </ul>
  );
}

function FromList({ creator }: { creator: Creator }) {
  const { state } = useApp();
  const posts = state.posts
    .filter((post) => post.creatorId === creator.id && post.author.kind === "creator")
    .sort((a, b) => b.createdAt - a.createdAt);
  const lockedCount = posts.filter((post) => post.visibility !== "public").length;

  return (
    <div>
      {lockedCount > 0 && (
        <p className="flex items-center gap-1.5 bg-surface px-4 pt-3 text-[12px] text-muted">
          <LockIcon size={13} /> 멤버십 글 {lockedCount}개 포함
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} showSpace={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FanList({ creator }: { creator: Creator }) {
  const { state, openCompose } = useApp();
  const posts = state.posts
    .filter((post) => post.creatorId === creator.id && post.author.kind === "fan")
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => openCompose(creator.id)}
        className="flex items-center gap-3 bg-surface px-4 py-3.5 text-left"
      >
        <FanAvatar fan={ME} size={36} />
        <span className="flex-1 text-[14px] text-muted">To. {creator.callName}에게 한마디</span>
        <CreatorAvatar creator={creator} size={24} />
      </button>
      <ul className="flex flex-col gap-2">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} showSpace={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}
