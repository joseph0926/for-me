import { CreatorAvatar } from "../components/Avatar";
import { useApp } from "../context";
import type { Notification, NotificationKind } from "../data";
import { relativeTime } from "../format";
import { creatorById } from "../store";

const kindLabel: Record<NotificationKind, string> = {
  "creator-comment": "크리에이터 댓글",
  "new-post": "새 글",
  live: "라이브",
  schedule: "일정",
};

export function AlertsScreen() {
  const { state, dispatch, now, go } = useApp();
  const items = [...state.notifications].sort((a, b) => b.createdAt - a.createdAt);
  const unread = items.filter((item) => !state.readNotifications.includes(item.id)).length;

  const follow = (item: Notification) => {
    dispatch({ type: "readNotification", id: item.id });
    const target = item.target;
    if (target.name === "live") go({ name: "live", creatorId: target.creatorId });
    else if (target.name === "post") go({ name: "post", postId: target.postId });
    else go({ name: "creator", creatorId: target.creatorId, tab: "schedule" });
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-24 pt-6 md:px-6 md:pb-12">
      <div className="flex items-center">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">알림</h1>
        <button
          type="button"
          disabled={unread === 0}
          onClick={() => dispatch({ type: "readAllNotifications" })}
          className="ml-auto rounded-full px-3 py-1.5 text-[13px] text-muted hover:bg-sunken disabled:opacity-40"
        >
          모두 읽음
        </button>
      </div>
      <ul className="mt-4 overflow-hidden rounded-2xl border border-line">
        {items.map((item) => {
          const isUnread = !state.readNotifications.includes(item.id);
          return (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => follow(item)}
                className={`flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-sunken/60 ${isUnread ? "bg-sunken/70" : ""}`}
              >
                <CreatorAvatar creator={creatorById(item.creatorId)} size={42} ring={item.kind === "live" ? "live" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="text-[12px] font-semibold text-muted">{kindLabel[item.kind]}</span>
                  <span className="block text-[14.5px] leading-snug">{item.text}</span>
                  <span className="text-[12px] text-muted">{relativeTime(item.createdAt, now)}</span>
                </span>
                {isUnread && <span className="mt-2 size-2 shrink-0 rounded-full bg-live" aria-label="읽지 않음" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
