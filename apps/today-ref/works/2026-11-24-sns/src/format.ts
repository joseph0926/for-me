// 시각과 수를 한국어로 짧게 쓴다.

export function relativeTime(at: number, now: number) {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  const date = new Date(at);
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function fullTime(at: number) {
  const date = new Date(at);
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const clock = `${period} ${hour % 12 === 0 ? 12 : hour % 12}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${clock}`;
}

// 1만 이상은 만 단위로 줄인다. 9,620처럼 그 아래는 쉼표만 넣는다.
export function compactCount(value: number) {
  if (value >= 10_000) {
    const man = value / 10_000;
    return `${man >= 10 ? Math.round(man) : Math.round(man * 10) / 10}만`;
  }
  return value.toLocaleString("ko-KR");
}
