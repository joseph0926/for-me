// 날짜는 시간대 영향을 받지 않도록 "YYYY-MM-DD" 문자열로만 다룬다.
export type DateKey = string;

export function toDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateKey(key: DateKey) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 0은 일요일.
export function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthPrefix(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayName(key: DateKey) {
  const { year, month, day } = parseDateKey(key);
  return weekdayNames[weekdayOf(year, month, day)];
}

export { weekdayNames };
