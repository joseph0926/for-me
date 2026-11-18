import { BRAND } from "../data";
import type { SearchCriteria } from "../search";
import { SearchBar } from "./SearchBar";
import { UserIcon } from "./icons";

/** 1100px 이상에서는 검색창을 로고와 같은 줄에 두고 화면 위에 고정한다. --header-h가 그 높이를 알린다. */
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
          className="order-1 shrink-0 text-[22px] font-extrabold tracking-[-0.04em] text-accent min-[1100px]:w-[216px] min-[1100px]:text-left"
        >
          {BRAND}
        </button>

        <div className="order-3 w-full min-[1100px]:order-2 min-[1100px]:mx-auto min-[1100px]:w-auto min-[1100px]:max-w-[800px] min-[1100px]:flex-1">
          <SearchBar criteria={criteria} onCriteriaChange={onCriteriaChange} />
        </div>

        <nav className="order-2 ml-auto flex shrink-0 items-center gap-1 min-[1100px]:order-3 min-[1100px]:ml-0">
          <button type="button" className="hidden h-10 rounded-full px-3.5 text-[14px] font-medium hover:bg-canvas md:block">
            숙소 등록
          </button>
          <button type="button" className="hidden h-10 rounded-full px-3.5 text-[14px] font-medium hover:bg-canvas md:block">
            예약 내역
          </button>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-full border border-line-strong pl-3 pr-4 text-[14px] font-medium hover:border-ink"
          >
            <UserIcon size={18} />
            로그인
          </button>
        </nav>
      </div>
    </header>
  );
}
