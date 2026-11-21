const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE) return "방금";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`;
  const date = new Date(at);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 1만 이상은 "1.2만"처럼 줄인다. 그보다 작으면 쉼표를 넣는다.
export function compactCount(value: number): string {
  if (value >= 10_000) {
    const man = value / 10_000;
    return `${man >= 100 ? Math.round(man) : Number(man.toFixed(1))}만`;
  }
  return value.toLocaleString("ko-KR");
}

export function won(value: number): string {
  return `₩${value.toLocaleString("ko-KR")}`;
}

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function scheduleDate(date: string): { month: string; day: string; weekday: string } {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];
  return { month: `${month}월`, day: String(day), weekday };
}

export function nextBillingDate(from: number): string {
  const date = new Date(from);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

// 라이브처럼 이어지고 있는 일의 경과 시간. "7분째", "2시간째"
export function elapsedLabel(since: number, now: number): string {
  const minutes = Math.max(1, Math.floor((now - since) / MINUTE));
  return minutes < 60 ? `${minutes}분째` : `${Math.floor(minutes / 60)}시간째`;
}
