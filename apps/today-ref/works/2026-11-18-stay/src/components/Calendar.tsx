import { AnimatePresence, motion, type Variants } from "motion/react";
import { useState } from "react";

import {
  type DateRange,
  type IsoDate,
  MAX_NIGHTS,
  TODAY,
  WEEKDAYS,
  addDays,
  formatLong,
  monthCells,
  monthOf,
  nightsBetween,
  shiftMonth,
} from "../dates";
import { ChevronLeft, ChevronRight } from "./icons";

const MONTHS_AHEAD = 11;
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

// 달을 넘기면 두 달 묶음이 넘기는 방향으로 24px 밀리며 이전 묶음과 겹쳐 바뀐다.
const monthSlide: Variants = {
  enter: (direction: number) => ({ x: 24 * direction, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: -24 * direction, opacity: 0 }),
};

interface CalendarProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onClose: () => void;
}

/** 두 달을 나란히 보여 주는 숙박 기간 선택 달력. 체크인과 체크아웃을 모두 고르면 onChange를 부른다. */
export function Calendar({ value, onChange, onClose }: CalendarProps) {
  const firstSelectable = monthOf(TODAY);
  const [monthOffset, setMonthOffset] = useState(() => {
    if (!value) return 0;
    const start = monthOf(value.checkIn);
    return (start.year - firstSelectable.year) * 12 + (start.month - firstSelectable.month);
  });
  const [direction, setDirection] = useState(1);
  // 체크인만 고른 상태. null이면 value를 그대로 보여 준다.
  const [pendingCheckIn, setPendingCheckIn] = useState<IsoDate | null>(null);
  const [hovered, setHovered] = useState<IsoDate | null>(null);

  const latestCheckOut = pendingCheckIn ? addDays(pendingCheckIn, MAX_NIGHTS) : null;
  const start = pendingCheckIn ?? value?.checkIn ?? null;
  const end = pendingCheckIn
    ? hovered && hovered > pendingCheckIn && latestCheckOut && hovered <= latestCheckOut
      ? hovered
      : null
    : (value?.checkOut ?? null);
  const nights = start && end ? nightsBetween({ checkIn: start, checkOut: end }) : 0;
  // 체크인만 고르고 마우스로 가리킨 날까지는 확정 전 미리보기라 더 옅게 칠한다.
  const previewing = pendingCheckIn !== null && end !== null;

  function turnMonth(step: number) {
    setDirection(step);
    setMonthOffset((offset) => offset + step);
  }

  function isDisabled(date: IsoDate) {
    if (date < TODAY) return true;
    return latestCheckOut !== null && date > latestCheckOut;
  }

  function pick(date: IsoDate) {
    if (pendingCheckIn && date > pendingCheckIn) {
      onChange({ checkIn: pendingCheckIn, checkOut: date });
      setPendingCheckIn(null);
      return;
    }
    setPendingCheckIn(date);
  }

  const months = [shiftMonth(firstSelectable, monthOffset), shiftMonth(firstSelectable, monthOffset + 1)];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between rounded-md bg-canvas px-4 py-3 text-[14px]">
        <span className="tabular">
          <span className={start ? "font-semibold" : "text-muted"}>{start ? formatLong(start) : "체크인"}</span>
          <span className="mx-2 text-subtle">-</span>
          <span className={end ? "font-semibold" : "text-muted"}>{end ? formatLong(end) : "체크아웃"}</span>
        </span>
        {nights > 0 && <span className="tabular font-semibold">{nights}박</span>}
      </div>

      <div className="relative mt-4 overflow-hidden">
        <button
          type="button"
          onClick={() => turnMonth(-1)}
          disabled={monthOffset === 0}
          aria-label="이전 달"
          className="absolute left-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-md text-ink hover:bg-canvas disabled:text-line-strong disabled:hover:bg-transparent"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => turnMonth(1)}
          disabled={monthOffset >= MONTHS_AHEAD - 1}
          aria-label="다음 달"
          className="absolute right-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-md text-ink hover:bg-canvas disabled:text-line-strong disabled:hover:bg-transparent"
        >
          <ChevronRight size={18} />
        </button>

        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={monthOffset}
            custom={direction}
            variants={monthSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: EASE_OUT_CUBIC }}
            className="grid gap-8 sm:grid-cols-2 sm:gap-10"
          >
            {months.map((month) => (
              <div key={`${month.year}-${month.month}`}>
                <p className="flex h-8 items-center justify-center text-[15px] font-semibold">
                  {month.year}년 {month.month}월
                </p>
                <div className="mt-3 grid grid-cols-7 text-center text-[12px] text-subtle">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday} className="h-7">
                      {weekday}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7" onMouseLeave={() => setHovered(null)}>
                  {monthCells(month).map((date, index) =>
                    date ? (
                      <DayCell
                        key={date}
                        date={date}
                        start={start}
                        end={end}
                        previewing={previewing}
                        disabled={isDisabled(date)}
                        onPick={pick}
                        onHover={setHovered}
                      />
                    ) : (
                      <span key={`blank-${index}`} />
                    ),
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <button
          type="button"
          onClick={() => {
            setPendingCheckIn(null);
            onChange(null);
          }}
          disabled={!value && !pendingCheckIn}
          className="-ml-2 h-9 rounded-md px-2 text-[14px] font-medium text-ink underline underline-offset-4 disabled:text-subtle disabled:no-underline"
        >
          날짜 지우기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-md border border-line-strong px-4 text-[14px] font-semibold hover:border-ink"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function DayCell({
  date,
  start,
  end,
  previewing,
  disabled,
  onPick,
  onHover,
}: {
  date: IsoDate;
  start: IsoDate | null;
  end: IsoDate | null;
  previewing: boolean;
  disabled: boolean;
  onPick: (date: IsoDate) => void;
  onHover: (date: IsoDate) => void;
}) {
  const isStart = date === start;
  const isEnd = date === end;
  // 미리보기의 끝 날짜는 아직 고르지 않았으므로 채우지 않고 테두리만 둔다.
  const isPreviewEnd = isEnd && previewing;
  const isFilled = isStart || (isEnd && !previewing);
  const inRange = start !== null && end !== null && date > start && date < end;
  const isToday = date === TODAY;
  const band = previewing ? "bg-accent-soft/55" : "bg-accent-soft";

  return (
    <div className="relative h-11">
      {inRange && <span className={`absolute inset-y-[3px] inset-x-0 ${band}`} />}
      {isStart && end && <span className={`absolute inset-y-[3px] left-1/2 right-0 ${band}`} />}
      {isEnd && start && <span className={`absolute inset-y-[3px] left-0 right-1/2 ${band}`} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPick(date)}
        onMouseEnter={() => onHover(date)}
        aria-pressed={isFilled}
        aria-label={isToday ? `${formatLong(date)}, 오늘` : formatLong(date)}
        className={`
          tabular relative mx-auto grid h-[38px] w-[38px] translate-y-[3px] place-items-center rounded-lg text-[14px]
          ${isFilled ? "bg-accent font-semibold text-white" : ""}
          ${isPreviewEnd ? "font-semibold ring-1 ring-ink ring-inset" : ""}
          ${!isFilled && !isPreviewEnd && !disabled ? "hover:ring-1 hover:ring-ink hover:ring-inset" : ""}
          ${disabled ? "text-[#c9c8c4]" : ""}
        `}
      >
        {Number(date.slice(8))}
        {isToday && (
          <span className={`absolute bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isFilled ? "bg-white" : "bg-accent"}`} />
        )}
      </button>
    </div>
  );
}
