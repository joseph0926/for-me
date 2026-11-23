export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function formatTaken(takenAt: string): string {
  const [date, time] = takenAt.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const weekday = weekdays[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday}) ${time ?? ""}`.trim();
}

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toUpperCase() ?? "";
}
