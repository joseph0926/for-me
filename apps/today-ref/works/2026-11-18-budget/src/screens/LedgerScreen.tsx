// 홈: 월 요약, 날마다 지출이 적힌 달력, 고른 날의 내역과 그 날짜로 추가하는 버튼.
import { AnimatePresence, motion } from "motion/react";

import { CategoryDot } from "../components/CategoryDot";
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

  const goToMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    const reachesToday = next.year === today.year && next.month === today.month;
    onSelectDate(reachesToday ? TODAY : toDateKey(next.year, next.month, 1));
  };

  return (
    <div className="h-full overflow-y-auto pb-6">
        <header className="flex items-center gap-1 px-4 pt-4">
          <MonthButton direction="prev" onClick={() => goToMonth(-1)} />
          <h1 className="min-w-[4.5rem] text-center text-[22px] font-bold">{month}월</h1>
          <MonthButton direction="next" disabled={isCurrentMonth} onClick={() => goToMonth(1)} />
          <span className="ml-auto text-[13px] font-semibold text-[var(--muted)]">살림장</span>
        </header>

        <section className="grid grid-cols-2 gap-x-4 gap-y-1 px-5 pt-3">
          <SummaryLine label="수입" amount={income} color="var(--income)" />
          <SummaryLine label="지출" amount={expense} color="var(--expense)" />
          <div className="col-span-2 flex items-baseline justify-between border-t border-[var(--line)] pt-2 text-[13px] text-[var(--muted)]">
            <span>수입-지출</span>
            <span className="text-[17px] font-semibold text-[var(--ink)]">{won(income - expense)}</span>
          </div>
        </section>

        <MonthCalendar
          entries={monthItems}
          year={year}
          month={month}
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
      className="grid size-8 place-items-center rounded-full text-[var(--ink)] disabled:text-[var(--faint)] enabled:active:bg-[var(--panel)]"
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
      <span className="truncate text-[20px] font-bold" style={{ color }}>
        {plain(amount)}
      </span>
    </div>
  );
}

function MonthCalendar({
  entries,
  year,
  month,
  selectedDate,
  onSelectDate,
}: {
  entries: Entry[];
  year: number;
  month: number;
  selectedDate: DateKey;
  onSelectDate: (date: DateKey) => void;
}) {
  const totals = totalsByDay(entries);
  const leadingBlanks = weekdayOf(year, month, 1);
  const lastDay = daysInMonth(year, month);
  const days = Array.from({ length: lastDay }, (_, index) => index + 1);

  return (
    <section className="mt-4 px-2">
      <div className="grid grid-cols-7 pb-1 text-center text-[11px] text-[var(--muted)]">
        {weekdayNames.map((name, index) => (
          <span key={name} className={index === 0 ? "text-[var(--expense)]" : index === 6 ? "text-[var(--income)]" : undefined}>
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const key = toDateKey(year, month, day);
          const total = totals.get(key);
          const isFuture = key > TODAY;
          const isSelected = key === selectedDate;
          const isToday = key === TODAY;
          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(key)}
              aria-pressed={isSelected}
              aria-label={`${month}월 ${day}일`}
              className={`flex h-[54px] flex-col items-center rounded-lg pt-1 ${isSelected ? "bg-[var(--accent-soft)]" : ""}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[13px] ${
                  isToday ? "bg-[var(--ink)] font-semibold text-[var(--surface)]" : isFuture ? "text-[var(--faint)]" : ""
                }`}
              >
                {day}
              </span>
              {total && total.expense > 0 && (
                <span className="text-[9.5px] leading-tight tracking-tight text-[var(--expense)]">{plain(total.expense)}</span>
              )}
              {total && total.income > 0 && (
                <span className="text-[9.5px] leading-tight tracking-tight text-[var(--income)]">{plain(total.income)}</span>
              )}
            </button>
          );
        })}
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
    <section className="mt-3 border-t-8 border-[var(--panel)]">
      <div className="flex items-center justify-between px-5 pb-1 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold">
            {day}일 {weekdayName(date)}요일
          </h2>
          <p className="flex gap-2 text-[13px]">
            {income > 0 && <span className="text-[var(--income)]">+{plain(income)}</span>}
            {expense > 0 && <span className="text-[var(--expense)]">-{plain(expense)}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          className="flex h-9 items-center gap-1 rounded-full bg-[var(--accent)] pl-3 pr-4 text-[14px] font-semibold text-white active:scale-95"
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
        <ul>
          <AnimatePresence initial={false}>
            {dayItems.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  backgroundColor: entry.id === highlightId ? ["var(--accent-soft)", "rgba(0,0,0,0)"] : "rgba(0,0,0,0)",
                }}
                transition={{ duration: 0.35, backgroundColor: { duration: 1.6 } }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-2.5">
                  <CategoryDot categoryId={entry.categoryId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{entry.memo || findCategory(entry.categoryId).name}</p>
                    {entry.memo && <p className="text-[12px] text-[var(--muted)]">{findCategory(entry.categoryId).name}</p>}
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
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
