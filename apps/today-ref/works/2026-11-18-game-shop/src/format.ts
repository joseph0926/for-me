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

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
}
