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
          // 묶음은 선 없이 여백으로 나눈다
          <section key={group} className="pt-1 pb-3">
            <h3 className="tabular flex items-center justify-between py-1 text-[13px] font-semibold">
              {groupLabels[group]}
              <span className="font-normal text-muted">{items.length}</span>
            </h3>
            <ol>
              {items.map((source) => (
                <li
                  key={source.id}
                  className={`flex gap-3 rounded-md px-2 py-[11px] ${source.id === highlightId ? "bg-accent-soft" : ""}`}
                >
                  {/* 출처 번호는 식별 번호라 면 없이 보조색 고정폭 숫자로 둔다(tastepin 배지 값) */}
                  <span className="tabular w-4 shrink-0 pt-px text-right text-[13px] text-muted">{source.id}</span>
                  <span className="min-w-0">
                    <span className="block text-[12px] text-muted">{source.publisher}</span>
                    <span className="mt-0.5 block text-[15px] leading-snug">{source.title}</span>
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
