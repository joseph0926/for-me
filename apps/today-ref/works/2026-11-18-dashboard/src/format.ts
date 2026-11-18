// 숫자와 KST 시각 표기. 시각 값은 data.ts와 같이 UTC 필드에 KST 벽시계를 담고 있다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

// 축 눈금처럼 자리가 좁은 곳에서 쓴다.
export function formatCompact(value: number) {
  if (value >= 10_000) {
    const man = value / 10_000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`;
  }
  return formatNumber(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest}초`;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
}

export function formatDay(at: number) {
  const date = new Date(at);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

export function formatDayWithWeekday(at: number) {
  return `${formatDay(at)} (${WEEKDAYS[new Date(at).getUTCDay()]})`;
}

export function formatHour(at: number) {
  return `${new Date(at).getUTCHours()}시`;
}

export function formatClock(at: number) {
  const date = new Date(at);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// 3시간 묶음처럼 시작과 끝이 있는 시간대. 24시는 다음 날 0시로 적지 않고 24:00으로 둔다.
export function formatHourRange(at: number, hours: number) {
  const start = new Date(at).getUTCHours();
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${pad(start)}–${pad(start + hours)}`;
}
