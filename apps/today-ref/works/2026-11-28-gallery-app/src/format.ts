// 날짜와 시간, 개수 표기. 가짜 데이터의 기준 "오늘"은 2026-11-28로 고정해 화면이 날마다 바뀌지 않게 한다.
export const today = "2026-11-28";
const currentYear = Number(today.slice(0, 4));

const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function parts(iso: string) {
  const [date, time = "00:00"] = iso.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function yearKey(iso: string) {
  return iso.slice(0, 4);
}

// 올해는 연도를 빼고 쓴다. 예: "11월 22일", "2025년 12월 24일"
export function dayLabel(iso: string) {
  const { year, month, day } = parts(iso);
  return year === currentYear ? `${month}월 ${day}일` : `${year}년 ${month}월 ${day}일`;
}

export function monthLabel(iso: string) {
  const { year, month } = parts(iso);
  return year === currentYear ? `${month}월` : `${year}년 ${month}월`;
}

export function weekday(iso: string) {
  const { year, month, day } = parts(iso);
  return weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function timeLabel(iso: string) {
  const { hour, minute } = parts(iso);
  const half = hour < 12 ? "오전" : "오후";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${half} ${h}:${String(minute).padStart(2, "0")}`;
}

export function fullDateLabel(iso: string) {
  const { year, month, day } = parts(iso);
  return `${year}년 ${month}월 ${day}일 ${weekday(iso)}`;
}

export function duration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

// "사진 11장, 동영상 2개". 0인 형식은 뺀다.
export function countLabel(photos: number, videos: number) {
  const words = [];
  if (photos > 0) words.push(`사진 ${photos.toLocaleString("ko-KR")}장`);
  if (videos > 0) words.push(`동영상 ${videos.toLocaleString("ko-KR")}개`);
  return words.length > 0 ? words.join(", ") : "항목 없음";
}
