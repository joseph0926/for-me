// 알림: '누가 무엇을 했는지와 시각' 한 행(r6 Kilogram 시안의 활동 목록). 같은 글에 같은 반응은 한 행으로 묶고, 오늘과 이번 주로 나눠 머리글을 위에 붙인다.
import { useEffect, useState, type ReactNode } from "react";

import { useApp } from "../app-context";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { HeartIcon, ReplyIcon, RepostIcon, UserPlusIcon } from "../components/Icons";
import { PageHeader } from "../components/PageHeader";
import { TabPanel } from "../components/TabPanel";
import { Tabs } from "../components/Tabs";
import { relativeTime } from "../format";
import { href, navigate, type NotificationFilter, type Route } from "../router";
import type { Notification, NotificationKind } from "../store";

const icons: Record<NotificationKind, ReactNode> = {
  like: <HeartIcon size={20} filled className="text-[var(--like)]" />,
  repost: <RepostIcon size={20} className="text-[var(--accent)]" />,
  follow: <UserPlusIcon size={20} className="text-[var(--ink)]" />,
  reply: <ReplyIcon size={20} className="text-[var(--muted)]" />,
};

const verbs: Record<NotificationKind, string> = {
  like: "내 글을 좋아해요",
  repost: "내 글을 재게시했어요",
  follow: "나를 팔로우해요",
  reply: "답글을 남겼어요",
};

export function Notifications({ filter }: { filter: NotificationFilter }) {
  const { state, dispatch, now } = useApp();
  // 이 화면을 열기 전까지 본 시각. 그 뒤에 온 알림은 화면에 있는 동안 옅은 강조색 면으로 남긴다.
  const [seenBefore] = useState(state.notificationsSeenAt);
  const latest = state.notifications[0]?.at ?? 0;

  // 알림을 화면에 보여 준 시점을 '봤다'로 기록한다. 보고 있는 동안 새로 온 알림도 같다.
  useEffect(() => {
    dispatch({ type: "seeNotifications", at: Math.max(latest, Date.now()) });
  }, [dispatch, latest]);

  const items = state.notifications.filter((item) => filter === "all" || item.kind === "reply");
  const groups = groupByDay(items, now);
  const tabs = [
    { id: "all", label: "전체", href: href({ name: "notifications", filter: "all" }) },
    { id: "replies", label: "답글", href: href({ name: "notifications", filter: "replies" }) },
  ];

  return (
    <>
      <PageHeader title="알림">
        <Tabs items={tabs} current={filter} label="알림 종류" />
      </PageHeader>
      <TabPanel order={["all", "replies"]} current={filter}>
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="sticky top-[108px] z-10 bg-[var(--surface)] px-4 pt-5 pb-1.5 text-[14px] font-semibold text-[var(--muted)]">{group.label}</h2>
          {group.items.map((item) => (
            <NotificationRow key={item.id} item={item} unread={item.at > seenBefore} />
          ))}
        </section>
      ))}
      {items.length === 0 && <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">아직 받은 답글이 없어요</p>}
      </TabPanel>
    </>
  );
}

function NotificationRow({ item, unread }: { item: Notification; unread: boolean }) {
  const { state, now } = useApp();
  const actors = item.actorIds.map((id) => state.users[id]);
  const [first, ...others] = actors;
  const post = item.postId ? state.posts[item.postId] : undefined;
  // 팔로우는 그 사람 프로필로, 나머지는 반응이 달린 글로 간다. 지워진 글이면 가지 않는다.
  const target: Route | undefined =
    item.kind === "follow" ? { name: "profile", handle: first.handle, tab: "posts" } : post ? { name: "post", id: post.id } : undefined;

  return (
    <div
      onClick={(event) => {
        if (!target || (event.target as HTMLElement).closest("a, button")) return;
        navigate(target);
      }}
      className={`flex gap-3 ${target ? "cursor-pointer" : ""} px-4 py-[11px] transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--hover)_55%,transparent)] ${
        unread ? "bg-[color-mix(in_srgb,var(--accent-soft)_70%,transparent)]" : ""
      }`}
    >
      <span className="grid w-10 shrink-0 justify-items-end pt-1">{icons[item.kind]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {actors.slice(0, 6).map((actor) => (
            <a key={actor.id} href={href({ name: "profile", handle: actor.handle, tab: "posts" })} aria-label={`${actor.name} 프로필`}>
              <Avatar user={actor} size={32} />
            </a>
          ))}
          {item.kind === "follow" && (
            <span className="ml-auto">
              <FollowButton userId={first.id} size="small" />
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[15px] leading-[1.5]">
          <strong className="font-[650]">{first.name}</strong>
          {others.length > 0 && <span> 님 외 {others.length}명이</span>}
          {others.length === 0 && <span> 님이</span>} {verbs[item.kind]}
          <span className="text-[var(--faint)]"> · {relativeTime(item.at, now)}</span>
        </p>
        {post && (
          <p className={`mt-0.5 line-clamp-2 text-[14px] leading-[1.5] ${item.kind === "reply" ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{post.text}</p>
        )}
      </div>
    </div>
  );
}

function groupByDay(items: Notification[], now: number) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60_000;
  const groups = [
    { label: "오늘", items: items.filter((item) => item.at >= startOfToday) },
    { label: "이번 주", items: items.filter((item) => item.at < startOfToday && item.at >= startOfWeek) },
    { label: "이전", items: items.filter((item) => item.at < startOfWeek) },
  ];
  return groups.filter((group) => group.items.length > 0);
}
