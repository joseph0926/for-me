import type { Totals } from "./data";
import { formatCompact, formatDuration, formatNumber, formatPercent } from "./format";

export type MetricId = keyof Totals;

export interface MetricDef {
  id: MetricId;
  label: string;
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  // 이탈률처럼 비율인 지표는 증감을 %p로 보여 준다.
  change: "relative" | "points";
  higherIsBetter: boolean;
  // 축 눈금 간격의 후보. 없으면 1, 2, 2.5, 5 배수에서 고른다.
  axisSteps?: number[];
}

export const METRICS: MetricDef[] = [
  {
    id: "visitors",
    label: "방문자",
    format: formatNumber,
    formatAxis: formatCompact,
    change: "relative",
    higherIsBetter: true,
  },
  {
    id: "pageviews",
    label: "페이지뷰",
    format: formatNumber,
    formatAxis: formatCompact,
    change: "relative",
    higherIsBetter: true,
  },
  {
    id: "bounce",
    label: "이탈률",
    format: formatPercent,
    formatAxis: (v) => `${Math.round(v)}%`,
    change: "points",
    higherIsBetter: false,
  },
  {
    id: "duration",
    label: "평균 체류 시간",
    format: formatDuration,
    formatAxis: formatDuration,
    change: "relative",
    higherIsBetter: true,
    axisSteps: [15, 30, 60, 120, 300, 600],
  },
];

export interface Delta {
  text: string;
  tone: "good" | "bad" | "flat";
}

export function computeDelta(metric: MetricDef, current: number, previous: number): Delta {
  const diff =
    metric.change === "points" ? current - previous : previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const unit = metric.change === "points" ? "%p" : "%";
  if (rounded === 0) return { text: `0${unit}`, tone: "flat" };
  const up = rounded > 0;
  const digits = Math.abs(rounded) >= 10 ? 0 : 1;
  return {
    text: `${up ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}${unit}`,
    tone: up === metric.higherIsBetter ? "good" : "bad",
  };
}
