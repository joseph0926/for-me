// 출처 시트의 내용: 묶음마다 개수를 붙이고, 행은 매체 이름(작게)과 제목 두 줄이다.
import type { Source } from "../answers";

const groupLabels: Record<Source["group"], string> = { web: "웹", file: "파일" };

export function SourcesList({ sources, highlightId }: { sources: Source[]; highlightId: number | null }) {
  const groups = (["web", "file"] as const).filter((group) => sources.some((source) => source.group === group));
  return (
    <div className="px-3">
      {groups.map((group) => {
        const items = sources.filter((source) => source.group === group);
        return (
          <section key={group} className="border-b border-line py-2 last:border-0">
            <h3 className="tabular flex items-center justify-between py-1 text-[13px] font-semibold">
              {groupLabels[group]}
              <span className="font-normal text-muted">{items.length}</span>
            </h3>
            <ol>
              {items.map((source) => (
                <li
                  key={source.id}
                  className={`flex gap-3 rounded-xl px-2 py-2.5 ${source.id === highlightId ? "bg-accent-soft" : ""}`}
                >
                  <span className="tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-raised text-[11px] font-semibold text-muted">
                    {source.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] text-muted">{source.publisher}</span>
                    <span className="block text-[14px] leading-snug">{source.title}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <p className="pt-3 text-[12px] text-faint">이 앱의 출처는 화면 시연을 위해 지어낸 자료입니다.</p>
    </div>
  );
}
