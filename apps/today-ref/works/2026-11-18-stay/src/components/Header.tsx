import { BRAND } from "../data";
import type { SearchCriteria } from "../search";
import { SearchBar } from "./SearchBar";

/**
 * 1100px 이상에서는 검색창을 로고와 같은 줄에 두고 화면 위에 고정한다. --header-h가 그 높이를 알린다.
 * 숙소 등록, 예약 내역, 로그인은 눌러도 갈 곳이 없어 두지 않는다.
 */
export function Header({
  criteria,
  onCriteriaChange,
  onHome,
}: {
  criteria: SearchCriteria;
  onCriteriaChange: (criteria: SearchCriteria) => void;
  onHome: () => void;
}) {
  return (
    <header className="z-40 border-b border-line bg-white min-[1100px]:sticky min-[1100px]:top-0">
      <div className="mx-auto flex max-w-[1760px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6 min-[1100px]:h-20 min-[1100px]:flex-nowrap min-[1100px]:py-0">
        <button
          type="button"
          onClick={onHome}
          className="shrink-0 text-[22px] font-extrabold tracking-[-0.04em] text-accent min-[1100px]:w-[216px] min-[1100px]:text-left"
        >
          {BRAND}
        </button>

        <div className="w-full min-[1100px]:mx-auto min-[1100px]:w-auto min-[1100px]:max-w-[800px] min-[1100px]:flex-1">
          <SearchBar criteria={criteria} onCriteriaChange={onCriteriaChange} />
        </div>

        {/* 로고 칸과 같은 폭을 오른쪽에 비워 검색창이 화면 가운데에 오게 한다. */}
        <div className="hidden shrink-0 min-[1100px]:block min-[1100px]:w-[216px]" aria-hidden="true" />
      </div>
    </header>
  );
}
