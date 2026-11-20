// 재생 시간은 1시간이 넘을 때만 시 단위를 붙인다. 예: 9:56, 1:35:17
export function formatTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = String(sec % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

// 목록에서 쓰는 짧은 길이. 예: 47분, 1시간 15분, 3분 34초
export function formatLength(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  if (minutes === 0) return `${Math.floor(totalSec)}초`;
  if (minutes < 10) return totalSec % 60 === 0 ? `${minutes}분` : `${minutes}분 ${Math.floor(totalSec % 60)}초`;
  if (minutes < 60) return `${minutes}분`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)}시간` : `${Math.floor(minutes / 60)}시간 ${rest}분`;
}

export function formatRemaining(remainingSec: number): string {
  if (remainingSec < 60) return "1분 미만 남음";
  return `${formatLength(Math.round(remainingSec / 60) * 60)} 남음`;
}

export function formatSize(megabytes: number): string {
  return megabytes >= 1000 ? `${(megabytes / 1024).toFixed(2)}GB` : `${megabytes}MB`;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}.${month}.${day}`;
}

// 목록 행처럼 좁은 곳에서는 올해 날짜의 연도를 뺀다. 예: 11.02, 2025.08.14
export function formatShortDate(isoDate: string, today: string): string {
  return isoDate.slice(0, 4) === today.slice(0, 4) ? isoDate.slice(5).replace("-", ".") : formatDate(isoDate);
}
