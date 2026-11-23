// 원본 이미지 좌표와 결과(자른 뒤) 좌표 사이의 변환.
// 순서: 원본 → 뒤집기와 90도 회전 → 수평 각도만큼 돌리며 빈 모서리가 보이지 않게 키우기 → 자르기.
import type { EditState, Rect } from "./state";

export interface Size {
  width: number;
  height: number;
}

// 90도 단위로 돌린 뒤의 크기. 수평 맞추기와 자르기는 이 크기의 판 위에서 한다.
export function turnedSize(source: Size, edit: EditState): Size {
  const sideways = edit.rotation === 90 || edit.rotation === 270;
  return sideways ? { width: source.height, height: source.width } : source;
}

// 판을 각도만큼 돌렸을 때 판 전체를 빈틈없이 덮으려면 이미지를 얼마나 키워야 하는지.
export function coverScale(size: Size, degrees: number): number {
  const angle = Math.abs((degrees * Math.PI) / 180);
  const { width: w, height: h } = size;
  return Math.max((w * Math.cos(angle) + h * Math.sin(angle)) / w, (w * Math.sin(angle) + h * Math.cos(angle)) / h);
}

export function fullRect(size: Size): Rect {
  return { x: 0, y: 0, w: size.width, h: size.height };
}

export function cropOf(source: Size, edit: EditState): Rect {
  return edit.crop ?? fullRect(turnedSize(source, edit));
}

// 원본 좌표를 돌린 판의 좌표로 옮기는 행렬. 자르기는 포함하지 않는다.
export function boardMatrix(source: Size, edit: EditState): DOMMatrix {
  const board = turnedSize(source, edit);
  return new DOMMatrix()
    .translate(board.width / 2, board.height / 2)
    .rotate(edit.straighten)
    .scale(coverScale(board, edit.straighten))
    .rotate(edit.rotation)
    .scale(edit.flipH ? -1 : 1, edit.flipV ? -1 : 1)
    .translate(-source.width / 2, -source.height / 2);
}

// 원본 좌표를 결과 좌표로 옮기는 행렬.
export function outputMatrix(source: Size, edit: EditState): DOMMatrix {
  const crop = cropOf(source, edit);
  return new DOMMatrix().translate(-crop.x, -crop.y).multiply(boardMatrix(source, edit));
}

export function applyPoint(matrix: DOMMatrix, [x, y]: [number, number]): [number, number] {
  const point = matrix.transformPoint(new DOMPoint(x, y));
  return [point.x, point.y];
}

// 결과 좌표에서 원본 좌표로. 화면에서 그린 표시를 원본 좌표로 저장할 때 쓴다.
export function toSource(source: Size, edit: EditState, point: [number, number]): [number, number] {
  return applyPoint(outputMatrix(source, edit).inverse(), point);
}

// 결과 이미지에서 1px가 원본 몇 px인지. 수평 맞추기로 키운 만큼 작아진다.
export function sourcePerOutput(edit: EditState, source: Size): number {
  return 1 / coverScale(turnedSize(source, edit), edit.straighten);
}

export function clampRect(rect: Rect, bounds: Size, minSize = 24): Rect {
  const w = Math.max(minSize, Math.min(rect.w, bounds.width));
  const h = Math.max(minSize, Math.min(rect.h, bounds.height));
  return {
    x: Math.max(0, Math.min(rect.x, bounds.width - w)),
    y: Math.max(0, Math.min(rect.y, bounds.height - h)),
    w,
    h,
  };
}

// 비율을 정한 자르기 범위를 판 안에서 가장 크게, 가운데에 맞춘다.
export function centeredRect(bounds: Size, ratio: number | null): Rect {
  if (ratio === null) return fullRect(bounds);
  let w = bounds.width;
  let h = w / ratio;
  if (h > bounds.height) {
    h = bounds.height;
    w = h * ratio;
  }
  return { x: (bounds.width - w) / 2, y: (bounds.height - h) / 2, w, h };
}
