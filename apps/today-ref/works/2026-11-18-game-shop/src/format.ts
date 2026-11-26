export function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function formatWon(value: number): string {
  return `₩${formatNumber(value)}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

// 구매 내역의 시각. 날짜와 분까지 적는다(예: 11월 26일 12:40).
export function formatDateTime(at: number): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`;
}
