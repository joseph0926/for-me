const HOUR = 60;
const DAY = 24 * HOUR;

export function formatAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return "방금";
  if (minutesAgo < HOUR) return `${minutesAgo}분`;
  if (minutesAgo < DAY) return `${Math.floor(minutesAgo / HOUR)}시간`;
  if (minutesAgo < 2 * DAY) return "어제";
  return `${Math.floor(minutesAgo / DAY)}일`;
}

export function formatCount(count: number): string {
  if (count < 10000) return count.toLocaleString("ko-KR");
  return `${(count / 10000).toFixed(1).replace(/\.0$/, "")}만`;
}

// 반올림한 비율의 합이 100이 되도록 나머지가 큰 항목부터 1씩 더한다.
export function toPercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return values.map(() => 0);

  const exact = values.map((value) => (value * 100) / total);
  const percents = exact.map(Math.floor);
  let missing = 100 - percents.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - percents[index] }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    percents[index] += 1;
    missing -= 1;
  }
  return percents;
}
