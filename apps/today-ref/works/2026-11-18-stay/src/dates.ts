// 날짜는 시간대 영향을 받지 않도록 "YYYY-MM-DD" 문자열로 다루고, 계산할 때만 UTC 자정으로 바꾼다.

export type IsoDate = string;

export interface DateRange {
  checkIn: IsoDate;
  checkOut: IsoDate;
}

export const TODAY: IsoDate = "2026-11-18";
export const MAX_NIGHTS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toUtc(date: IsoDate) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

export function nightsBetween(range: DateRange | null) {
  if (!range) return 0;
  return Math.round((toUtc(range.checkOut) - toUtc(range.checkIn)) / DAY_MS);
}

function parts(date: IsoDate) {
  const value = new Date(toUtc(date));
  return { month: value.getUTCMonth() + 1, day: value.getUTCDate(), weekday: WEEKDAYS[value.getUTCDay()] };
}

/** 11월 20일 (금) */
export function formatLong(date: IsoDate) {
  const { month, day, weekday } = parts(date);
  return `${month}월 ${day}일 (${weekday})`;
}

/** 11.20 (금) */
export function formatShort(date: IsoDate) {
  const { month, day, weekday } = parts(date);
  return `${month}.${day} (${weekday})`;
}

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

export function monthOf(date: IsoDate): MonthRef {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

export function shiftMonth({ year, month }: MonthRef, offset: number): MonthRef {
  const index = year * 12 + (month - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** 일요일부터 시작하는 달력 칸. 앞쪽 빈칸은 null이다. */
export function monthCells({ year, month }: MonthRef): (IsoDate | null)[] {
  const first = Date.UTC(year, month - 1, 1);
  const leading = new Date(first).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (IsoDate | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 0; day < length; day += 1) {
    cells.push(fromUtc(first + day * DAY_MS));
  }
  return cells;
}
