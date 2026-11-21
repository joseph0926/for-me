// 지금까지 만든 프롬프트 목록. 대상으로 거르고 눌러서 그 대화를 다시 연다.
import { useState } from "react";

import { purposeLabel, targetLabel, targets, type TargetId } from "../generate";
import { latestResult, type Session } from "../state";

const filters: { id: TargetId | "all"; label: string }[] = [{ id: "all", label: "전체" }, ...targets];

function relativeDay(time: number, now: number): string {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.ceil((startOfToday - time) / (24 * 60 * 60 * 1000));
  if (time >= startOfToday) return "오늘";
  if (days <= 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(time).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

interface HistoryViewProps {
  sessions: Session[];
  activeId: string | null;
  busy: boolean;
  now: number;
  onOpen: (id: string) => void;
}

export function HistoryView({ sessions, activeId, busy, now, onOpen }: HistoryViewProps) {
  const [filter, setFilter] = useState<TargetId | "all">("all");
  const shown = sessions.filter((session) => filter === "all" || session.target === filter);

  return (
    <section className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-[22px] font-bold tracking-[-0.01em]">기록</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="대상으로 거르기">
        {filters.map((item) => {
          const count = item.id === "all" ? sessions.length : sessions.filter((session) => session.target === item.id).length;
          return (
            <button key={item.id} type="button" aria-pressed={filter === item.id} className={filter === item.id ? "chip chip-selected" : "chip"} onClick={() => setFilter(item.id)}>
              {item.label}
              <span className="text-[var(--muted)]">{count}</span>
            </button>
          );
        })}
      </div>
      {busy && <p className="mt-4 text-[14px] text-[var(--muted)]">프롬프트를 쓰는 동안에는 다른 기록을 열 수 없어요.</p>}

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-[var(--muted)]">이 대상으로 만든 프롬프트가 아직 없어요.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {shown.map((session) => {
            const result = latestResult(session);
            // 첫 줄은 제목이나 역할 문장을 되풀이하므로, 결과가 어떤 묶음으로 짜였는지를 보여 준다.
            const preview = (result?.prompt.match(/^## .+$/gm) ?? []).map((heading) => heading.slice(3)).join(", ");
            const thumbnails = session.baseImages.slice(0, 2);
            return (
              <li key={session.id}>
                <button type="button" className="history-row" disabled={busy && session.id !== activeId} onClick={() => onOpen(session.id)} aria-current={session.id === activeId ? "true" : undefined}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{session.title}</span>
                      {session.id === activeId && <span className="meta-tag meta-tag-target shrink-0">열려 있음</span>}
                    </div>
                    <p className="mt-1 truncate text-[14px] text-[var(--muted)]">{preview}</p>
                    <p className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                      <span className="meta-tag meta-tag-target">{targetLabel(session.target)}</span>
                      {session.purpose && <span className="meta-tag">{purposeLabel(session.purpose)}</span>}
                      <span className="px-1 py-0.5 text-[var(--muted)]">{relativeDay(session.createdAt, now)}</span>
                    </p>
                  </div>
                  {thumbnails.length > 0 && (
                    <div className="flex shrink-0 -space-x-3">
                      {thumbnails.map((image) => (
                        <img key={image.id} src={image.url} alt="" className="size-12 rounded-xl border-2 border-[var(--surface)] object-cover" />
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
