import { motion } from "motion/react";

import type { Dashboard, PeriodId } from "../data";
import { computeDelta, METRICS, type Delta, type MetricId } from "../metrics";
import { SPRING } from "../motion";
import { AreaChart } from "./AreaChart";
import { RollingNumber } from "./RollingNumber";

interface MetricPanelProps {
  dashboard: Dashboard;
  period: PeriodId;
  metricId: MetricId;
  onMetricChange: (id: MetricId) => void;
}

// 위쪽 지표 탭에서 고른 지표가 바로 아래 그래프를 정한다.
// 고른 칸은 밑줄 대신 강조색을 옅게 섞은 면으로 표시하고 숫자도 강조색으로 둔다(tastepin 지표 탭 값: 바탕 면, 강조색).
export function MetricPanel({ dashboard, period, metricId, onMetricChange }: MetricPanelProps) {
  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0];
  const chartPoints = dashboard.points.map((p) => ({ at: p.at, value: p[metric.id], partial: p.partial }));

  return (
    <section className="rounded-md border border-line bg-panel">
      <div role="tablist" aria-label="지표" className="grid grid-cols-2 sm:grid-cols-4">
        {METRICS.map((m, index) => {
          const selected = m.id === metricId;
          const delta = computeDelta(m, dashboard.totals[m.id], dashboard.previous[m.id]);
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onMetricChange(m.id)}
              className={`
                group relative isolate min-w-0 px-3.5 pb-4 pt-3.5 sm:px-4 text-left lg:px-5
                ${index > 0 ? "sm:border-l sm:border-line" : ""}
                ${index % 2 === 1 ? "border-l border-line" : ""}
                ${index >= 2 ? "border-t border-line sm:border-t-0" : ""}
              `}
            >
              {selected && (
                // 칸 모서리를 카드 안쪽 모서리(5px)에 맞춘다. 휴대폰 두 줄 배치에서는 둘째 칸이 오른쪽 위 모서리다.
                <motion.span
                  layoutId="metric-tone"
                  aria-hidden="true"
                  className={`
                    absolute inset-0 -z-10 bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-raised))]
                    ${index === 0 ? "rounded-tl-[5px]" : ""}
                    ${index === 1 ? "rounded-tr-[5px] sm:rounded-none" : ""}
                    ${index === 3 ? "sm:rounded-tr-[5px]" : ""}
                  `}
                  transition={SPRING}
                />
              )}
              <div className={`text-[14px] ${selected ? "text-ink" : "text-muted group-hover:text-ink-2"}`}>
                {m.label}
              </div>
              <div className="mt-1.5 flex items-center gap-2 whitespace-nowrap lg:gap-2.5">
                <RollingNumber
                  value={dashboard.totals[m.id]}
                  text={m.format(dashboard.totals[m.id])}
                  className={`tabular text-[20px] font-semibold leading-8 tracking-[-0.02em] sm:text-[22px] lg:text-[26px] ${
                    selected ? "text-accent" : "text-ink-2"
                  }`}
                />
                <DeltaText delta={delta} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-2 pb-2 pt-4">
        <AreaChart points={chartPoints} period={period} metric={metric} />
      </div>
    </section>
  );
}

const DELTA_TONE: Record<Delta["tone"], string> = {
  good: "text-good",
  bad: "text-bad",
  flat: "text-muted",
};

// 면 없이 화살표와 12px 색 글자만 둔다(tastepin 증감 표시 값). 색은 좋아짐과 나빠짐을, 화살표는 오르내림을 말한다.
function DeltaText({ delta }: { delta: Delta }) {
  return (
    <span className={`tabular text-[12px] font-medium leading-none ${DELTA_TONE[delta.tone]}`} aria-label={delta.label}>
      {delta.text}
    </span>
  );
}
