import { motion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

import { pointUnit, type PeriodId } from "../data";
import { formatDay, formatDayWithWeekday, formatHour, formatHourRange } from "../format";
import type { MetricDef } from "../metrics";

export interface ChartPoint {
  at: number;
  value: number;
  // 아직 끝나지 않은 오늘이나 현재 시간대. 마지막 구간을 점선으로 그린다.
  partial: boolean;
}

interface AreaChartProps {
  points: ChartPoint[];
  period: PeriodId;
  metric: MetricDef;
}

const HEIGHT = 272;
const PAD = { top: 16, right: 20, bottom: 30, left: 60 };
const MIN_LABEL_GAP = 84;
const TOOLTIP_WIDTH = 188;
const TOOLTIP_OFFSET = 12;

export function AreaChart({ points, period, metric }: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(...points.map((p) => p.value)), metric.axisSteps);
  const top = ticks[ticks.length - 1];
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + i * step;
  const y = (value: number) => PAD.top + innerHeight - (top === 0 ? 0 : (value / top) * innerHeight);

  const unit = pointUnit(period);
  const lastIndex = points.length - 1;
  const hasPartialTail = points[lastIndex]?.partial && points.length > 1;
  const solidEnd = hasPartialTail ? lastIndex - 1 : lastIndex;
  const linePath = points
    .slice(0, solidEnd + 1)
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join("");
  const tailPath = hasPartialTail
    ? `M${x(solidEnd).toFixed(1)},${y(points[solidEnd].value).toFixed(1)}L${x(lastIndex).toFixed(1)},${y(points[lastIndex].value).toFixed(1)}`
    : "";
  const baseline = PAD.top + innerHeight;
  const areaPath = `${points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join("")}L${x(lastIndex).toFixed(1)},${baseline}L${PAD.left},${baseline}Z`;

  // 3시간 묶음은 자정 점에만 날짜를 달고, 나머지는 오늘 쪽 끝 눈금이 보이도록 끝에서부터 같은 간격으로 고른다.
  const candidates = points
    .map((p, i) => ({ at: p.at, i }))
    .filter(({ at }) => unit !== "3h" || new Date(at).getUTCHours() === 0)
    .map(({ i }) => i);
  const maxLabels = Math.max(1, Math.floor(innerWidth / MIN_LABEL_GAP));
  const labelEvery = Math.max(1, Math.ceil(candidates.length / maxLabels));
  const xLabels = candidates.filter((_, k) => (candidates.length - 1 - k) % labelEvery === 0);

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (step === 0) return;
    const left = event.currentTarget.getBoundingClientRect().left;
    const index = Math.round((event.clientX - left - PAD.left) / step);
    setHoverIndex(Math.min(lastIndex, Math.max(0, index)));
  };

  const hovered = hoverIndex === null ? null : points[hoverIndex];
  // 오른쪽에 자리가 없으면 왼쪽에, 양쪽 다 없으면 차트 안에서 가운데로 맞춰 화면 밖으로 넘치지 않게 한다.
  let tooltipLeft = 0;
  if (hoverIndex !== null) {
    const pointX = x(hoverIndex);
    if (pointX + TOOLTIP_OFFSET + TOOLTIP_WIDTH <= width) tooltipLeft = pointX + TOOLTIP_OFFSET;
    else if (pointX - TOOLTIP_OFFSET - TOOLTIP_WIDTH >= 0) tooltipLeft = pointX - TOOLTIP_OFFSET - TOOLTIP_WIDTH;
    else tooltipLeft = Math.min(Math.max(pointX - TOOLTIP_WIDTH / 2, 0), width - TOOLTIP_WIDTH);
  }

  return (
    <div ref={containerRef} className="relative h-[272px] select-none">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${metric.label} 추이`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          className="block touch-pan-y"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-line)"
                strokeDasharray={tick === 0 ? undefined : "2 4"}
              />
              <text
                x={PAD.left - 12}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="tabular fill-faint text-[11px]"
              >
                {metric.formatAxis(tick)}
              </text>
            </g>
          ))}

          {xLabels.map((i) => (
            <text
              key={points[i].at}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === lastIndex ? "end" : "middle"}
              className="tabular fill-faint text-[11px]"
            >
              {unit === "hour" ? formatHour(points[i].at) : formatDay(points[i].at)}
            </text>
          ))}

          {/* 기간이 바뀌면 점 개수가 달라져 모양을 이어 바꿀 수 없으므로 새로 그린다. */}
          <g key={`${period}:${points.length}`}>
            <motion.path
              initial={{ opacity: 0, d: areaPath }}
              animate={{ d: areaPath, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              fill={`url(#${gradientId})`}
            />
            <motion.path
              initial={{ opacity: 0, d: linePath }}
              animate={{ d: linePath, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {hasPartialTail && (
              <motion.path
                initial={{ opacity: 0, d: tailPath }}
                animate={{ d: tailPath, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1.75}
                strokeDasharray="3 4"
                strokeLinecap="round"
              />
            )}
          </g>

          {hovered && hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hoverIndex)}
                x2={x(hoverIndex)}
                y1={PAD.top}
                y2={baseline}
                stroke="var(--color-ink-2)"
                strokeOpacity={0.35}
              />
              <circle
                cx={x(hoverIndex)}
                cy={y(hovered.value)}
                r={4}
                fill="var(--color-accent)"
                stroke="var(--color-panel)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
      )}

      {hovered && hoverIndex !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-raised px-3 py-2.5 shadow-[0_8px_24px_-6px_rgb(0_0_0/0.6)]"
          style={{ left: tooltipLeft, top: PAD.top, width: TOOLTIP_WIDTH }}
        >
          <div className="flex items-center justify-between gap-3 text-[12px] text-muted">
            <span>
              {formatDayWithWeekday(hovered.at)}
              {unit === "hour" && ` ${formatHour(hovered.at)}`}
              {unit === "3h" && ` ${formatHourRange(hovered.at, 3)}`}
            </span>
            {hovered.partial && <span className="text-faint">집계 중</span>}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2 rounded-full bg-accent" />
              {metric.label}
            </span>
            <span className="tabular font-medium text-ink">{metric.format(hovered.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 차트 폭은 부모 폭을 따른다. 글자가 늘어나지 않도록 viewBox 확대 대신 실제 픽셀 폭으로 그린다.
function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

// 0부터 최대값을 덮는 눈금 4~5개. 간격은 1, 2, 2.5, 5의 10배수나 지표가 정한 후보에서 고른다.
function niceTicks(max: number, steps?: number[]) {
  const target = Math.max(max, 1) / 4;
  let step: number;
  if (steps) {
    step = steps.find((s) => s >= target) ?? steps[steps.length - 1];
  } else {
    const magnitude = 10 ** Math.floor(Math.log10(target));
    step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= target) ?? 10) * magnitude;
  }
  const count = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}
