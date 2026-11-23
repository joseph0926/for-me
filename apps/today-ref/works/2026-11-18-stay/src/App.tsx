import { useState } from "react";

import { DetailPage } from "./components/DetailPage";
import { Header } from "./components/Header";
import { ResultsPage } from "./components/ResultsPage";
import { STAYS } from "./data";
import { type Filters, type SearchCriteria, type SortKey, EMPTY_FILTERS, toggle } from "./search";

// 라우터 없이 화면을 하나의 상태로 고른다. 결과 화면은 돌아갈 스크롤 위치를 함께 가지고,
// 상세에서 돌아왔으면 방금 본 숙소를 기억해 그 카드를 잠깐 표시한다.
type Route =
  | { name: "results"; scrollY: number; returnedFromId: string | null }
  | { name: "detail"; stayId: string; returnScrollY: number };

const INITIAL_CRITERIA: SearchCriteria = {
  query: "",
  range: { checkIn: "2026-11-20", checkOut: "2026-11-22" },
  guests: { adults: 2, children: 0 },
};

export function App() {
  const [route, setRoute] = useState<Route>({ name: "results", scrollY: 0, returnedFromId: null });
  const [criteria, setCriteria] = useState(INITIAL_CRITERIA);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const detailStay = route.name === "detail" ? STAYS.find((stay) => stay.id === route.stayId) : undefined;

  function toggleSave(id: string) {
    setSavedIds((ids) => toggle(ids, id));
  }

  function changeCriteriaFromHeader(next: SearchCriteria) {
    setCriteria(next);
    // 상세에서 목적지를 바꾸면 새 검색 결과를 위에서부터 보여 준다.
    if (route.name === "detail" && next.query !== criteria.query) setRoute({ name: "results", scrollY: 0, returnedFromId: null });
  }

  return (
    <div className="min-h-dvh [--header-h:0px] min-[1100px]:[--header-h:81px]">
      <Header criteria={criteria} onCriteriaChange={changeCriteriaFromHeader} onHome={() => setRoute({ name: "results", scrollY: 0, returnedFromId: null })} />

      {detailStay && route.name === "detail" ? (
        <DetailPage
          key={detailStay.id}
          stay={detailStay}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          saved={savedIds.includes(detailStay.id)}
          onToggleSave={() => toggleSave(detailStay.id)}
          onBack={() => setRoute({ name: "results", scrollY: route.returnScrollY, returnedFromId: route.stayId })}
        />
      ) : (
        <ResultsPage
          criteria={criteria}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          savedIds={savedIds}
          onToggleSave={toggleSave}
          onOpenStay={(stayId) => setRoute({ name: "detail", stayId, returnScrollY: window.scrollY })}
          initialScrollY={route.name === "results" ? route.scrollY : 0}
          returnedFromId={route.name === "results" ? route.returnedFromId : null}
        />
      )}
    </div>
  );
}
