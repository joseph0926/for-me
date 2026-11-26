// 홈: 월 요약, 날마다 지출이 적힌 달력, 고른 날의 내역과 그 날짜로 추가하는 버튼.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

import { CategoryDot } from "../components/CategoryDot";
import { RollingNumber } from "../components/RollingNumber";
import { type Entry, TODAY, findCategory } from "../data";
import {
  type DateKey,
  daysInMonth,
  parseDateKey,
  shiftMonth,
  toDateKey,
  weekdayName,
  weekdayNames,
  weekdayOf,
} from "../dates";
import { inMonth, plain, sumOf, totalsByDay, won } from "../ledger";
import { easeOut, slideVariants } from "../motion";

// 달 넘김(tastepin 날짜 선택 값): 날짜 칸과 달 이름이 넘기는 방향으로 24px 밀리며 200ms 동안 겹쳐 교차한다.
const monthTransition = { duration: 0.2, ease: easeOut };

interface Props {
  entries: Entry[];
  selectedDate: DateKey;
  highlightId: string | null;
  onSelectDate: (date: DateKey) => void;
  onOpenAdd: () => void;
}

export function LedgerScreen({ entries, selectedDate, highlightId, onSelectDate, onOpenAdd }: Props) {
  const { year, month } = parseDateKey(selectedDate);
  const today = parseDateKey(TODAY);
  const isCurrentMonth = year === today.year && month === today.month;

  const monthItems = inMonth(entries, year, month);
  const income = sumOf(monthItems, "income");
  const expense = sumOf(monthItems, "expense");

  // 이전 달로 가면 -1, 다음 달로 가면 1. 달이 그대로면 직전 방향을 유지한다.
  const monthIndex = year * 12 + month;
  const previousMonthIndex = useRef(monthIndex);
  const direction = monthIndex >= previousMonthIndex.current ? 1 : -1;
  useEffect(() => {
    previousMonthIndex.current = monthIndex;
  }, [monthIndex]);

  const goToMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    const reachesToday = next.year === today.year && next.month === today.month;
    onSelectDate(reachesToday ? TODAY : toDateKey(next.year, next.month, 1));
  };

  return (
    <div className="h-full overflow-y-auto pb-6">
      <header className="flex items-center gap-1 px-4 pt-4">
        <MonthButton direction="prev" onClick={() => goToMonth(-1)} />
        <h1 className="grid min-w-[4.5rem] text-center text-[22px] font-bold" aria-live="polite">
          <AnimatePresence initial={false} custom={direction}>
            <motion.span
              key={monthIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={monthTransition}
              className="[grid-area:1/1]"
            >
              {month}월
            </motion.span>
          </AnimatePresence>
        </h1>
        <MonthButton direction="next" disabled={isCurrentMonth} onClick={() => goToMonth(1)} />
        <span className="ml-auto text-[13px] font-semibold text-[var(--muted)]">살림장</span>
      </header>

      {/* 묶음은 선 없이 여백과 글자 굵기로 나눈다(tastepin 그룹 규칙). 금액 단위는 모든 화면에서 원을 붙인다. */}
      <section className="grid grid-cols-2 gap-x-4 px-5 pt-3">
        <SummaryLine label="수입" amount={income} color="var(--income)" />
        <SummaryLine label="지출" amount={expense} color="var(--expense)" />
        <div className="col-span-2 mt-1.5 flex items-baseline justify-between text-[13px] text-[var(--muted)]">
          <span>수입-지출</span>
          <RollingNumber value={income - expense} format={won} className="justify-items-end text-[17px] font-semibold text-[var(--ink)]" />
        </div>
      </section>

      <MonthCalendar
        entries={monthItems}
        year={year}
        month={month}
        direction={direction}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <DayList entries={entries} date={selectedDate} highlightId={highlightId} onOpenAdd={onOpenAdd} />
    </div>
  );
}

function MonthButton({ direction, disabled, onClick }: { direction: "prev" | "next"; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "이전 달" : "다음 달"}
      className="grid size-8 place-items-center rounded-[6px] text-[var(--ink)] disabled:text-[var(--faint)]"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

function SummaryLine({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[13px] text-[var(--muted)]">{label}</span>
      <RollingNumber value={amount} format={won} className="min-w-0 justify-items-end text-[20px] font-bold" style={{ color }} />
    </div>
  );
}

function MonthCalendar({
  entries,
  year,
  month,
  direction,
  selectedDate,
  onSelectDate,
}: {
  entries: Entry[];
  year: number;
  month: number;
  direction: number;
  selectedDate: DateKey;
  onSelectDate: (date: DateKey) => void;
}) {
  const totals = totalsByDay(entries);
  const leadingBlanks = weekdayOf(year, month, 1);
  const lastDay = daysInMonth(year, month);
  const days = Array.from({ length: lastDay }, (_, index) => index + 1);

  return (
    <section className="mt-4 px-2">
      {/* 일요일 머리글만 빨간 글자로 둔다. 토요일까지 파랗게 칠하면 수입을 뜻하는 파랑과 겹친다. */}
      <div className="grid grid-cols-7 pb-1 text-center text-[11px] text-[var(--muted)]">
        {weekdayNames.map((name, index) => (
          <span key={name} className={index === 0 ? "text-[var(--expense)]" : undefined}>
            {name}
          </span>
        ))}
      </div>
      <div className="grid overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`${year}-${month}`}
            role="group"
            aria-label={`${year}년 ${month}월`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={monthTransition}
            className="grid grid-cols-7 gap-y-0.5 [grid-area:1/1]"
          >
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {days.map((day) => {
              const key = toDateKey(year, month, day);
              const total = totals.get(key);
              const isFuture = key > TODAY;
              const isSelected = key === selectedDate;
              const isToday = key === TODAY;
              // tastepin 날짜 선택 값: 고른 날은 본문색으로 채운 사각(모서리 6px)에 반전 글자, 오늘은 숫자 아래 4px 강조색 점.
              // 칸 아래에 그날 금액 두 줄이 붙어 시편의 36px 대신 30px 사각으로 줄였다.
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isFuture}
                  onClick={() => onSelectDate(key)}
                  aria-pressed={isSelected}
                  aria-label={`${month}월 ${day}일${isToday ? ", 오늘" : ""}`}
                  className="flex h-[58px] flex-col items-center pt-0.5"
                >
                  <span
                    className={`relative grid size-[30px] place-items-center rounded-[6px] text-[13px] ${
                      isSelected
                        ? "bg-[var(--ink)] font-semibold text-[var(--surface)]"
                        : isFuture
                          ? "text-[var(--faint)]"
                          : ""
                    }`}
                  >
                    {day}
                    {isToday && (
                      <span
                        aria-hidden
                        className={`absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full ${
                          isSelected ? "bg-[var(--surface)]" : "bg-[var(--accent)]"
                        }`}
                      />
                    )}
                  </span>
                  {total && total.expense > 0 && (
                    <span className="mt-0.5 text-[9.5px] leading-tight tracking-tight text-[var(--expense)]">{plain(total.expense)}</span>
                  )}
                  {total && total.income > 0 && (
                    <span className="text-[9.5px] leading-tight tracking-tight text-[var(--income)]">{plain(total.income)}</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function DayList({
  entries,
  date,
  highlightId,
  onOpenAdd,
}: {
  entries: Entry[];
  date: DateKey;
  highlightId: string | null;
  onOpenAdd: () => void;
}) {
  // 나중에 넣은 내역이 위로 온다. 방금 저장한 내역이 화면 밖으로 밀려나지 않게 한다.
  const dayItems = entries.filter((entry) => entry.date === date).reverse();
  const { day } = parseDateKey(date);
  const expense = sumOf(dayItems, "expense");
  const income = sumOf(dayItems, "income");

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between px-5 pb-1">
        <div>
          <h2 className="text-[17px] font-bold">
            {day}일 {weekdayName(date)}요일
          </h2>
          <p className="mt-0.5 flex gap-2 text-[13px]">
            {income > 0 && <span className="text-[var(--income)]">+{won(income)}</span>}
            {expense > 0 && <span className="text-[var(--expense)]">-{won(expense)}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          className="flex h-10 items-center gap-1 rounded-[6px] bg-[var(--accent)] pl-3 pr-4 text-[14px] font-semibold text-white"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {day}일에 추가
        </button>
      </div>
      {dayItems.length === 0 ? (
        <p className="px-5 py-8 text-center text-[14px] text-[var(--muted)]">이 날 내역이 없어요</p>
      ) : (
        // 날짜마다 목록을 새로 그린다. 같은 AnimatePresence를 이어 쓰면 이전 날짜의 줄이 잠깐 남아 새 줄을 아래로 밀었다.
        <ul key={date}>
          <AnimatePresence initial={false}>
            {dayItems.map((entry) => {
              const isNew = entry.id === highlightId;
              const category = findCategory(entry.categoryId);
              // 날짜를 바꿀 때마다 목록이 미끄러지며 다시 들어오지 않도록, 방금 저장한 내역만 펼치며 들어온다
              // (tastepin 규칙: 반복해서 누르는 목록 갱신은 목록을 움직이지 않고 바로 바꾼다).
              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={isNew ? { opacity: 0, height: 0 } : false}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.22, ease: easeOut }}
                  className={`overflow-hidden ${isNew ? "just-added" : ""}`}
                >
                  <div className="flex items-center gap-3 px-5 py-[11px]">
                    <CategoryDot categoryId={entry.categoryId} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{entry.memo || category.name}</p>
                      {entry.memo && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{category.name}</p>}
                    </div>
                    <span
                      className="text-[15px] font-semibold"
                      style={{ color: entry.kind === "income" ? "var(--income)" : "var(--ink)" }}
                    >
                      {entry.kind === "income" ? "+" : "-"}
                      {won(entry.amount)}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
