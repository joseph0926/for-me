import type { Mark, Point, Region, Stroke } from "./document";

export type Resizable = Exclude<Mark, Stroke>;
const corners = [
  { id: "nw", right: false, bottom: false, cursor: "nwse-resize" },
  { id: "ne", right: true, bottom: false, cursor: "nesw-resize" },
  { id: "sw", right: false, bottom: true, cursor: "nesw-resize" },
  { id: "se", right: true, bottom: true, cursor: "nwse-resize" },
] as const;
export type Corner = typeof corners[number];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function outlineBounds(mark: Mark, scale: number): Region {
  const stroke = mark.tool === "highlight" || mark.tool === "pen" ? mark.strokeWidth : 0;
  const inset = stroke / 2 + 4 / scale;
  return {
    x: mark.area.x - inset, y: mark.area.y - inset,
    width: mark.area.width + 2 * inset, height: mark.area.height + 2 * inset,
  };
}

export function handles(mark: Resizable, scale: number, view: Region) {
  const bounds = outlineBounds(mark, scale);
  const padX = Math.min(4 / scale, view.width / 2);
  const padY = Math.min(4 / scale, view.height / 2);
  return corners.map(corner => ({
    corner,
    x: clamp(bounds.x + (corner.right ? bounds.width : 0), view.x + padX, view.x + view.width - padX),
    y: clamp(bounds.y + (corner.bottom ? bounds.height : 0), view.y + padY, view.y + view.height - padY),
  }));
}

export function hitHandle(mark: Mark | undefined, point: Point, scale: number, view: Region) {
  if (!mark || mark.tool === "pen") return;
  const area = mark.area;
  const nearCenterX = Math.abs(point.x - area.x - area.width / 2) < Math.min(2 / scale, area.width / 4);
  const nearCenterY = Math.abs(point.y - area.y - area.height / 2) < Math.min(2 / scale, area.height / 4);
  if (nearCenterX && nearCenterY) return;
  let closest: Corner | undefined;
  let distance = 8 / scale;
  for (const { corner, x, y } of handles(mark, scale, view)) {
    const gap = Math.hypot(point.x - x, point.y - y);
    if (gap <= distance) {
      distance = gap;
      closest = corner;
    }
  }
  return closest;
}

export function resizeMark(mark: Resizable, corner: Corner, start: Point, end: Point, view: Region): Resizable {
  const area = mark.area;
  const anchorX = corner.right ? area.x : area.x + area.width;
  const anchorY = corner.bottom ? area.y : area.y + area.height;
  const dx = (end.x - start.x) * (corner.right ? 1 : -1);
  const dy = (end.y - start.y) * (corner.bottom ? 1 : -1);
  const maxWidth = Math.max(area.width, corner.right ? view.x + view.width - anchorX : anchorX - view.x);
  const maxHeight = Math.max(area.height, corner.bottom ? view.y + view.height - anchorY : anchorY - view.y);
  let width = clamp(area.width + Math.round(dx), 1, maxWidth);
  let height = clamp(area.height + Math.round(dy), 1, maxHeight);
  let resized = mark;
  if (mark.tool === "memo") {
    // 대각선 방향으로 끈 거리만 글자 배율에 반영해 반대편 모서리와 글자 비율을 유지한다.
    const ratio = 1 + (dx * area.width + dy * area.height) / (area.width ** 2 + area.height ** 2);
    const limit = Math.min(maxWidth / area.width, maxHeight / area.height);
    const fontSize = clamp(Math.round(mark.fontSize * ratio), 1, Math.min(4096, Math.floor(mark.fontSize * limit)));
    if (fontSize === mark.fontSize) return mark;
    width = area.width * (fontSize / mark.fontSize);
    height = area.height * (fontSize / mark.fontSize);
    resized = { ...mark, layoutFontSize: mark.layoutFontSize ?? mark.fontSize, fontSize };
  }
  if (width === area.width && height === area.height) return mark;
  return { ...resized, area: {
    x: corner.right ? anchorX : anchorX - width, y: corner.bottom ? anchorY : anchorY - height, width, height,
  } };
}
