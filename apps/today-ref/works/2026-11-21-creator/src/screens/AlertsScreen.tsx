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
  const { state, dispatch, now, open, openLive } = useApp();
  const items = [...state.notifications].sort((a, b) => b.createdAt - a.createdAt);
  const unread = items.filter((item) => !state.readNotifications.includes(item.id)).length;

  const follow = (item: Notification) => {
    dispatch({ type: "readNotification", id: item.id });
    const target = item.target;
    if (target.name === "live") openLive(target.creatorId);
    else if (target.name === "post") open({ name: "post", postId: target.postId, focusComment: false });
    else open({ name: "creator", creatorId: target.creatorId, section: "schedule" });
  };

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <header className="flex items-center px-4 pb-2 pt-3">
        <h1 className="text-[21px] font-extrabold tracking-[-0.03em]">알림</h1>
        <button
          type="button"
          disabled={unread === 0}
          onClick={() => dispatch({ type: "readAllNotifications" })}
          className="ml-auto text-[13px] text-muted disabled:opacity-40"
        >
          모두 읽음
        </button>
      </header>
      <ul>
        {items.map((item) => {
          const isUnread = !state.readNotifications.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => follow(item)}
                className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${isUnread ? "bg-sunken/70" : ""}`}
              >
                <CreatorAvatar creator={creatorById(item.creatorId)} size={40} ring={item.kind === "live" ? "live" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="text-[11.5px] font-semibold text-muted">{kindLabel[item.kind]}</span>
                  <span className="block text-[14px] leading-snug">{item.text}</span>
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
