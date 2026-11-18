import { useState, type ReactNode } from "react";

import { Avatar } from "../components/Avatar";
import { FollowButton, LargeTitle } from "../components/Chrome";
import { HeartIcon, PersonIcon, ReplyIcon, RepostIcon } from "../components/Icons";
import { activities, users, type Activity, type ActivityKind } from "../data";
import { formatAgo } from "../format";

type Filter = "all" | ActivityKind;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "follow", label: "팔로우" },
  { id: "reply", label: "답글" },
  { id: "mention", label: "멘션" },
  { id: "like", label: "좋아요" },
  { id: "repost", label: "리포스트" },
];

const kindBadges: Record<ActivityKind, { icon: ReactNode; className: string; srLabel: string }> = {
  like: { icon: <HeartIcon size={10} filled strokeWidth={2.5} />, className: "bg-like", srLabel: "좋아요" },
  reply: { icon: <ReplyIcon size={10} filled strokeWidth={2.5} />, className: "bg-ink", srLabel: "답글" },
  mention: { icon: <span className="text-[10px] font-bold leading-none">@</span>, className: "bg-ink", srLabel: "멘션" },
  follow: { icon: <PersonIcon size={10} filled strokeWidth={2.5} />, className: "bg-ink", srLabel: "팔로우" },
  repost: { icon: <RepostIcon size={10} strokeWidth={3} />, className: "bg-ink", srLabel: "리포스트" },
};

export function ActivityScreen({
  followingIds,
  onToggleFollow,
}: {
  followingIds: string[];
  onToggleFollow: (userId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? activities : activities.filter((activity) => activity.kind === filter);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <LargeTitle>활동</LargeTitle>
        <div className="scroll-x flex gap-2 px-4 pb-3" role="tablist">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`hit h-[34px] shrink-0 rounded-[10px] border px-4 text-[15px] font-semibold transition-colors ${
                filter === id ? "border-ink bg-ink text-surface" : "border-line-strong text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="scroll-y min-h-0 flex-1">
        {visible.map((activity) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            isFollowing={followingIds.includes(activity.userId)}
            onToggleFollow={() => onToggleFollow(activity.userId)}
          />
        ))}
        {visible.length === 0 && <p className="py-16 text-center text-[15px] text-muted">아직 소식이 없어요</p>}
        <div className="h-8" />
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  isFollowing,
  onToggleFollow,
}: {
  activity: Activity;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  const user = users[activity.userId];
  const badge = kindBadges[activity.kind];
  const isOwnText = activity.kind === "reply" || activity.kind === "mention";

  return (
    <div className="flex gap-3 pl-4 pt-3">
      <span className="relative h-fit">
        <Avatar user={user} size={36} />
        <span
          className={`absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full text-surface ring-2 ring-surface ${badge.className}`}
        >
          {badge.icon}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-line pb-3 pr-4">
        <div className="min-w-0 flex-1 text-[15px] leading-[21px]">
          <p className="flex gap-1.5">
            <span className="truncate font-semibold">{user.handle}</span>
            <span className="shrink-0 text-muted">{formatAgo(activity.minutesAgo)}</span>
            <span className="sr-only">{badge.srLabel}</span>
          </p>
          {activity.kind === "follow" ? (
            <p className="text-muted">회원님을 팔로우했습니다</p>
          ) : (
            <p className={`line-clamp-2 break-keep ${isOwnText ? "" : "text-muted"}`}>{activity.text}</p>
          )}
        </div>
        {activity.kind === "follow" && <FollowButton isFollowing={isFollowing} onToggle={onToggleFollow} />}
      </div>
    </div>
  );
}
