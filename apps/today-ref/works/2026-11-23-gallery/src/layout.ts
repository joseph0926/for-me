// 행 높이를 맞추고 너비는 원본 비율대로 늘이는 격자 줄 나누기.
export interface Sized {
  id: string;
  width: number;
  height: number;
}

export interface Row<T> {
  height: number;
  cells: { item: T; width: number }[];
}

export function justifyRows<T extends Sized>(items: T[], containerWidth: number, targetHeight: number, gap: number): Row<T>[] {
  if (containerWidth <= 0) return [];
  const rows: Row<T>[] = [];
  let pending: T[] = [];
  let aspectSum = 0;

  const flush = (fill: boolean) => {
    if (pending.length === 0) return;
    const gaps = gap * (pending.length - 1);
    // 마지막 줄은 늘이지 않고 목표 높이를 지킨다. 한 장이 너무 넓으면 컨테이너 너비에 맞춰 줄인다.
    const fitted = (containerWidth - gaps) / aspectSum;
    const height = fill ? fitted : Math.min(targetHeight, fitted);
    rows.push({ height, cells: pending.map((item) => ({ item, width: (item.width / item.height) * height })) });
    pending = [];
    aspectSum = 0;
  };

  for (const item of items) {
    pending.push(item);
    aspectSum += item.width / item.height;
    const naturalWidth = aspectSum * targetHeight + gap * (pending.length - 1);
    if (naturalWidth >= containerWidth) flush(true);
  }
  flush(false);
  return rows;
}
