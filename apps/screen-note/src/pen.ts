import type { PenStyle, Point, Stroke } from "./document";

export function appendSamples(points: number[], samples: Point[]) {
  const extra: number[] = [];
  let x = points.at(-2);
  let y = points.at(-1);
  for (const point of samples) {
    if (point.x === x && point.y === y) continue;
    x = point.x;
    y = point.y;
    extra.push(x, y);
  }
  return extra.length ? points.concat(extra) : points;
}

export function finishStroke(points: number[], style: PenStyle): Stroke {
  let left = points[0], right = left;
  let top = points[1], bottom = top;
  for (let i = 2; i < points.length; i += 2) {
    left = Math.min(left, points[i]);
    right = Math.max(right, points[i]);
    top = Math.min(top, points[i + 1]);
    bottom = Math.max(bottom, points[i + 1]);
  }
  return {
    tool: "pen", ...style,
    area: { x: left, y: top, width: right - left, height: bottom - top },
    points: points.map((value, index) => value - (index % 2 === 0 ? left : top)),
  };
}

export function hitsStroke(stroke: Stroke, point: Point, radius: number) {
  const x = point.x - stroke.area.x;
  const y = point.y - stroke.area.y;
  const p = stroke.points;
  if (Math.hypot(x - p[0], y - p[1]) <= radius) return true;
  for (let i = 2; i < p.length; i += 2) {
    const ax = p[i - 2], ay = p[i - 1];
    const dx = p[i] - ax, dy = p[i + 1] - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(x - ax - t * dx, y - ay - t * dy) <= radius) return true;
  }
  return false;
}
