import { useApp } from "../context";
import { creators, liveNow, scheduleEvents } from "../data";
import { compactCount, elapsedLabel, scheduleDate } from "../format";
import { creatorById } from "../store";
import { CreatorAvatar } from "./Avatar";
import { BellIcon } from "./Icons";
import { Scene } from "./Scene";
import { creatorAccent } from "./tone";

const UPCOMING_LIMIT = 4;

// 넓은 화면(1280px 이상)에서만 보이는 보조 열
export function RightRail() {
  const { state, dispatch, now, go, showToast } = useApp();
  const live = creatorById(liveNow.creatorId);
  const upcoming = scheduleEvents
    .filter((event) => state.subscriptions.includes(event.creatorId))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, UPCOMING_LIMIT);
  const suggestions = creators.filter((creator) => !state.subscriptions.includes(creator.id));

  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-line px-5 py-6 xl:flex">
      <section>
        <h2 className="text-[13px] font-semibold text-muted">지금 라이브</h2>
        <button
          type="button"
          onClick={() => go({ name: "live", creatorId: live.id })}
          className="mt-2 block w-full overflow-hidden rounded-2xl border border-line text-left"
        >
          <span className="relative block">
            <Scene motif="stage" hue={live.hue} className="aspect-video w-full" />
            <span className="absolute left-2.5 top-2.5 rounded bg-live px-1.5 text-[11px] font-extrabold leading-[18px] text-white">LIVE</span>
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2 text-[11.5px] leading-5 text-white">
              {compactCount(liveNow.viewers)}명 · {elapsedLabel(liveNow.startedAt, now)}
            </span>
          </span>
          <span className="flex items-center gap-2 px-3 py-2.5">
            <CreatorAvatar creator={live} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold">{liveNow.title}</span>
              <span className="block text-[12px] text-muted">{live.name}</span>
            </span>
          </span>
        </button>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold text-muted">다가오는 일정</h2>
        <ul className="mt-1">
          {upcoming.map((event) => {
            const creator = creatorById(event.creatorId);
            const date = scheduleDate(event.date);
            const reminded = state.reminders.includes(event.id);
            return (
              <li key={event.id} className="flex items-center gap-3 py-2">
                <span className="w-10 shrink-0 text-center">
                  <span className="block text-[10.5px] text-muted">{date.month}</span>
                  <span className="block text-[17px] font-bold leading-tight">{date.day}</span>
                </span>
                <button
                  type="button"
                  onClick={() => go({ name: "creator", creatorId: creator.id, tab: "schedule" })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[13.5px] font-medium">{event.title}</span>
                  <span className="block text-[12px]" style={{ color: creatorAccent(creator.hue) }}>
                    {creator.callName} · {event.time}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "toggleReminder", eventId: event.id });
                    showToast(reminded ? "알림을 껐어요" : `${event.time} 30분 전에 알려 드릴게요`);
                  }}
                  aria-pressed={reminded}
                  aria-label={reminded ? `${event.title} 알림 끄기` : `${event.title} 알림 받기`}
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${reminded ? "bg-ink text-surface" : "bg-sunken text-muted"}`}
                >
                  <BellIcon size={16} />
                </button>
              </li>
            );
          })}
          {upcoming.length === 0 && <li className="py-3 text-[13px] text-muted">구독한 크리에이터의 일정이 없어요</li>}
        </ul>
      </section>

      {suggestions.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold text-muted">이런 크리에이터는 어때요</h2>
          <ul className="mt-1">
            {suggestions.map((creator) => (
              <li key={creator.id} className="flex items-center gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => go({ name: "creator", creatorId: creator.id, tab: "home" })}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <CreatorAvatar creator={creator} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold">{creator.name}</span>
                    <span className="block truncate text-[12px] text-muted">{creator.role}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "toggleSubscribe", creatorId: creator.id });
                    showToast(`${creator.name} 님을 구독했어요`);
                  }}
                  className="h-8 shrink-0 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-surface"
                >
                  구독
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
