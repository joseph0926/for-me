// 지금까지 만든 프롬프트 목록. 눌러서 그 대화를 다시 연다.
// 기록이 몇 개뿐이고 고를 때 정한 부분(r6의 기록 진입)에 거르기가 없어, 대상 거르기 칩 없이 목록 하나로 둔다.
import { purposeLabel, targetLabel } from "../generate";
import { latestResult, type Session } from "../state";

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
  return (
    <section className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-8 sm:px-6">
      {/* 머리줄의 "기록" 탭이 이미 이 화면의 이름을 보여 주므로 제목은 화면 읽기 프로그램에만 둔다. */}
      <h1 className="sr-only">기록</h1>
      {busy && <p className="mb-3 px-3 text-[14px] text-[var(--muted)]">프롬프트를 쓰는 동안에는 다른 기록을 열 수 없어요.</p>}

      <ul className="-mx-3 flex flex-col gap-1">
        {sessions.map((session) => {
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
                    {session.id === activeId && <span className="state-badge shrink-0">열려 있음</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[14px]">{preview}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3">
                    <span className="meta-tag">{targetLabel(session.target)}</span>
                    {session.purpose && <span className="meta-tag">{purposeLabel(session.purpose)}</span>}
                    <span className="meta-tag">{relativeDay(session.createdAt, now)}</span>
                  </p>
                </div>
                {thumbnails.length > 0 && (
                  <div className="flex shrink-0 -space-x-3">
                    {thumbnails.map((image) => (
                      <img key={image.id} src={image.url} alt="" className="size-12 rounded-md border-2 border-[var(--surface)] object-cover" />
                    ))}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
