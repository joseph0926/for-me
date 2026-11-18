// 내역 목록에서 화면이 쓰는 합계를 계산한다. 모든 화면이 같은 내역 배열에서 계산해 숫자가 어긋나지 않게 한다.
import { type DateKey, daysInMonth, monthPrefix, parseDateKey } from "./dates";
import type { Entry, EntryKind } from "./data";

export function won(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function plain(amount: number) {
  return amount.toLocaleString("ko-KR");
}

export function inMonth(entries: Entry[], year: number, month: number) {
  const prefix = monthPrefix(year, month);
  return entries.filter((entry) => entry.date.startsWith(prefix));
}

export function sumOf(entries: Entry[], kind: EntryKind) {
  return entries.reduce((total, entry) => (entry.kind === kind ? total + entry.amount : total), 0);
}

export function totalsByDay(entries: Entry[]) {
  const totals = new Map<DateKey, { expense: number; income: number }>();
  for (const entry of entries) {
    const day = totals.get(entry.date) ?? { expense: 0, income: 0 };
    day[entry.kind] += entry.amount;
    totals.set(entry.date, day);
  }
  return totals;
}

export function expenseByCategory(entries: Entry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== "expense") continue;
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.amount);
  }
  return totals;
}

// 1일부터 lastDay까지 날마다 누적 지출. 결과의 i번째는 (i+1)일까지의 합이다.
export function cumulativeExpense(entries: Entry[], year: number, month: number, lastDay: number) {
  const daily = new Array<number>(lastDay).fill(0);
  for (const entry of inMonth(entries, year, month)) {
    if (entry.kind !== "expense") continue;
    const { day } = parseDateKey(entry.date);
    if (day <= lastDay) daily[day - 1] += entry.amount;
  }
  let running = 0;
  return daily.map((amount) => (running += amount));
}

// 오늘이 이번 달의 몇 퍼센트 지점인지. 예산 막대의 경과 눈금에 쓴다.
export function monthElapsedRatio(today: DateKey) {
  const { year, month, day } = parseDateKey(today);
  return day / daysInMonth(year, month);
}
