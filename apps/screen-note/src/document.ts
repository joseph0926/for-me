import { hitsStroke } from "./pen.ts";

export type Point = { x: number; y: number };
export type Region = Point & { width: number; height: number };
export type Tool = "select" | "pen" | "memo" | "crop" | "cover" | "highlight";
export type BoxTool = "crop" | "cover" | "highlight";
export type Memo = { tool: "memo"; area: Region; text: string; fontSize: number; layoutFontSize?: number; bold: boolean; color: string };
export type PenStyle = { color: string; strokeWidth: number };
export type Stroke = PenStyle & { tool: "pen"; area: Region; points: number[] };
export type Mark = Memo | Stroke | { tool: "cover" | "highlight"; area: Region; strokeWidth: number; color: string };
export type Edit =
  | { tool: "mark"; id: number; mark: Mark; recolored?: boolean }
  | { tool: "remove"; id: number }
  | { tool: "crop"; area: Region };

export const toolNames = {
  select: "선택",
  memo: "메모",
  pen: "펜",
  crop: "자르기",
  cover: "가리기",
  highlight: "강조",
} satisfies Record<Tool, string>;

export function visibleRegion(edits: Edit[], image: Region): Region {
  for (let index = edits.length - 1; index >= 0; index--) {
    const edit = edits[index];
    if (edit.tool === "crop") return edit.area;
  }
  return image;
}

export function imagePoint(client: Point, display: Region, view: Region): Point {
  const fraction = (value: number) => Math.min(1, Math.max(0, value));
  return {
    x: view.x + fraction((client.x - display.x) / display.width) * view.width,
    y: view.y + fraction((client.y - display.y) / display.height) * view.height,
  };
}

export function selection(start: Point, end: Point): Region {
  const x = Math.floor(Math.min(start.x, end.x));
  const y = Math.floor(Math.min(start.y, end.y));
  return {
    x, y,
    width: Math.ceil(Math.max(start.x, end.x)) - x,
    height: Math.ceil(Math.max(start.y, end.y)) - y,
  };
}

export function currentMarks(edits: Edit[]): Map<number, Mark> {
  const marks = new Map<number, Mark>();
  for (const edit of edits) {
    if (edit.tool === "mark") marks.set(edit.id, edit.mark);
    if (edit.tool === "remove") marks.delete(edit.id);
  }
  return marks;
}

// 같은 표시의 연속된 색 변경을 한 번의 편집으로 묶는다. 색상 선택 창은 고르는 동안 색을 계속 보낸다.
export function recolorMark(edits: Edit[], id: number, color: string): Edit[] {
  const last = edits.at(-1);
  const continued = last?.tool === "mark" && last.id === id && last.recolored === true;
  const kept = continued ? edits.slice(0, -1) : edits;
  const mark = currentMarks(kept).get(id);
  if (!mark) return edits;
  if (mark.color === color) return kept;
  return [...kept, { tool: "mark", id, mark: { ...mark, color }, recolored: true }];
}

export function hitMark(marks: Map<number, Mark>, point: Point, scale: number) {
  let hit: number | null = null;
  // 강조는 테두리만 그리므로 안쪽을 누르면 그 아래 표시를 먼저 고른다.
  let hollow: number | null = null;
  for (const [id, mark] of marks) {
    const { x, y, width, height } = mark.area;
    const margin = mark.tool === "highlight" || mark.tool === "pen" ? Math.max(3 / scale, mark.strokeWidth / 2) : 0;
    if (point.x < x - margin || point.x > x + width + margin ||
        point.y < y - margin || point.y > y + height + margin) continue;
    if (mark.tool === "pen" && !hitsStroke(mark, point, margin)) continue;
    const insideBorder = point.x > x + margin && point.x < x + width - margin &&
      point.y > y + margin && point.y < y + height - margin;
    if (mark.tool === "highlight" && insideBorder) hollow = id;
    else hit = id;
  }
  return hit ?? hollow;
}

export function moveMark(mark: Mark, start: Point, end: Point, view: Region): Mark {
  function shift(origin: number, delta: number, size: number, edge: number, span: number) {
    // 자르기 전에 만든 표시가 일부만 보이는 경우에도 처음 잡은 위치를 유지한다.
    const far = edge + span - size;
    return Math.min(Math.max(origin, edge, far), Math.max(Math.min(origin, edge, far), origin + Math.round(delta)));
  }
  const area = mark.area;
  const x = shift(area.x, end.x - start.x, area.width, view.x, view.width);
  const y = shift(area.y, end.y - start.y, area.height, view.y, view.height);
  if (x === area.x && y === area.y) return mark;
  return { ...mark, area: { ...area, x, y } };
}
