// 왼쪽 세로 도구 열의 도구와 표시 설정.
import type { Size } from "./editor/geometry";
import type { EditState } from "./editor/state";

export type Tool = "select" | "crop" | "adjust" | "filter" | "pen" | "text" | "shape";

export const toolList: { id: Tool; label: string; key: string }[] = [
  { id: "select", label: "고르기", key: "V" },
  { id: "crop", label: "자르기와 회전", key: "C" },
  { id: "adjust", label: "조정", key: "A" },
  { id: "filter", label: "필터", key: "F" },
  { id: "pen", label: "펜", key: "P" },
  { id: "text", label: "글", key: "T" },
  { id: "shape", label: "도형", key: "U" },
];

export interface MarkStyle {
  color: string;
  // 원본 이미지 픽셀 기준.
  width: number;
  textSize: number;
  shape: "rect" | "arrow";
}

export const markColors = ["#ffffff", "#111317", "#ff4d4f", "#ffb020", "#2fbf71", "#3a86ff", "#a259ff"];

// -1은 원본 비율이다. 원본 비율은 90도 돌렸는지에 따라 달라져 값으로 미리 정해 둘 수 없다.
export const cropRatios: { label: string; value: number | null }[] = [
  { label: "자유", value: null },
  { label: "원본", value: -1 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

export function resolveRatio(ratio: number | null, source: Size, edit: EditState): number | null {
  if (ratio !== -1) return ratio;
  const sideways = edit.rotation === 90 || edit.rotation === 270;
  return sideways ? source.height / source.width : source.width / source.height;
}
