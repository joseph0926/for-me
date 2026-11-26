import { AnimatePresence } from "motion/react";
import { type ReactNode, useCallback, useRef, useState } from "react";

import { AREAS, STAYS } from "../data";
import { formatShort, nightsBetween } from "../dates";
import { useDismiss } from "../hooks";
import { type SearchCriteria, guestsLabel, normalizeQuery, placeLabel } from "../search";
import { Calendar } from "./Calendar";
import { GuestStepper } from "./GuestStepper";
import { Popover } from "./Popover";
import { SearchIcon } from "./icons";

type Panel = "destination" | "dates" | "guests" | null;

export function SearchBar({
  criteria,
  onCriteriaChange,
}: {
  criteria: SearchCriteria;
  onCriteriaChange: (criteria: SearchCriteria) => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  // 목적지 입력 중인 글자. null이면 확정된 목적지를 보여 준다.
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setPanel(null);
    setTypedQuery(null);
  }, []);
  useDismiss(rootRef, panel !== null, close);

  function commitQuery(text: string) {
    onCriteriaChange({ ...criteria, query: normalizeQuery(text) });
    close();
  }

  const typed = typedQuery?.trim() ?? "";
  const areaOptions = typed === "" ? AREAS : AREAS.filter((area) => area.name.includes(typed) || area.district.includes(typed));
  const nights = nightsBetween(criteria.range);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap rounded-md border border-line-strong bg-white sm:h-14 sm:flex-nowrap">
        <label
          className={`order-1 flex min-w-0 basis-[calc(100%-60px)] cursor-text flex-col justify-center rounded-tl-md px-4 py-2 sm:flex-[1.25] sm:basis-0 sm:rounded-l-md sm:py-0 ${panel === "destination" ? "bg-canvas" : ""}`}
        >
          <span className="text-[12px] text-muted">목적지</span>
          <input
            value={typedQuery ?? placeLabel(criteria.query)}
            onFocus={(event) => {
              setPanel("destination");
              event.currentTarget.select();
            }}
            onChange={(event) => setTypedQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitQuery(event.currentTarget.value);
            }}
            placeholder="지역, 숙소 이름"
            className="w-full truncate bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-subtle"
          />
        </label>

        <Segment
          className="order-3 w-1/3 border-t sm:order-2 sm:w-auto sm:flex-1 sm:border-l sm:border-t-0"
          active={panel === "dates"}
          label="체크인"
          value={criteria.range ? formatShort(criteria.range.checkIn) : null}
          onClick={() => setPanel(panel === "dates" ? null : "dates")}
        />
        <Segment
          className="order-4 w-1/3 border-l border-t sm:order-3 sm:w-auto sm:flex-1 sm:border-t-0"
          active={panel === "dates"}
          label={nights > 0 ? `체크아웃 (${nights}박)` : "체크아웃"}
          value={criteria.range ? formatShort(criteria.range.checkOut) : null}
          onClick={() => setPanel(panel === "dates" ? null : "dates")}
        />
        <Segment
          className="order-5 w-1/3 border-l border-t sm:order-4 sm:w-auto sm:flex-1 sm:border-t-0"
          active={panel === "guests"}
          label="인원"
          value={guestsLabel(criteria.guests)}
          onClick={() => setPanel(panel === "guests" ? null : "guests")}
        />

        <div className="order-2 flex w-[60px] items-center justify-center p-1.5 sm:order-5 sm:w-auto">
          <button
            type="button"
            onClick={() => (typedQuery !== null ? commitQuery(typedQuery) : close())}
            className="press flex h-10 items-center gap-1.5 rounded-md bg-accent px-3 text-[15px] font-semibold text-white hover:bg-accent-hover sm:h-full sm:px-5"
          >
            <SearchIcon size={18} />
            <span className="hidden sm:inline">검색</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {panel === "destination" && (
          <Popover key="destination" label="목적지" placement="left-0 w-full p-2 sm:w-[340px]" onClose={close}>
            <ul className="max-h-[360px] overflow-y-auto">
              <DestinationOption label="서울 전체" detail={`숙소 ${STAYS.length}곳`} onPick={() => commitQuery("")} />
              {areaOptions.map((area) => (
                <DestinationOption
                  key={area.name}
                  label={area.name}
                  detail={`서울 ${area.district}`}
                  onPick={() => commitQuery(area.name)}
                />
              ))}
              {typed !== "" && areaOptions.length === 0 && (
                <DestinationOption label={`"${typed}" 검색`} detail="숙소 이름과 지역에서 찾기" onPick={() => commitQuery(typed)} />
              )}
            </ul>
          </Popover>
        )}
        {panel === "dates" && (
          <Popover
            key="dates"
            sheet
            label="숙박 날짜"
            placement="sm:left-1/2 sm:w-[700px] sm:-translate-x-1/2"
            onClose={close}
          >
            <Calendar
              value={criteria.range}
              onChange={(range) => {
                onCriteriaChange({ ...criteria, range });
                if (range) close();
              }}
              onClose={close}
            />
          </Popover>
        )}
        {panel === "guests" && (
          <Popover key="guests" sheet label="인원" placement="sm:right-0 sm:w-[320px]" onClose={close}>
            <GuestStepper guests={criteria.guests} onChange={(guests) => onCriteriaChange({ ...criteria, guests })} />
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}

function Segment({
  className,
  active,
  label,
  value,
  onClick,
}: {
  className: string;
  active: boolean;
  label: ReactNode;
  value: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col justify-center border-line px-4 py-2 text-left hover:bg-canvas sm:py-0 ${active ? "bg-canvas" : ""} ${className}`}
    >
      <span className="truncate text-[12px] text-muted">{label}</span>
      <span className={`tabular truncate text-[15px] ${value ? "font-semibold" : "text-subtle"}`}>{value ?? "날짜 선택"}</span>
    </button>
  );
}

function DestinationOption({ label, detail, onPick }: { label: string; detail: string; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="flex w-full items-center rounded-md px-3 py-2.5 text-left hover:bg-canvas"
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium">{label}</span>
          <span className="block truncate text-[13px] text-muted">{detail}</span>
        </span>
      </button>
    </li>
  );
}
