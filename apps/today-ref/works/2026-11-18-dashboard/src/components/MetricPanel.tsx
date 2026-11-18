import { motion } from "motion/react";

import type { Dashboard, PeriodId } from "../data";
import { computeDelta, METRICS, type Delta, type MetricId } from "../metrics";
import { AreaChart } from "./AreaChart";

interface MetricPanelProps {
  dashboard: Dashboard;
  period: PeriodId;
  metricId: MetricId;
  onMetricChange: (id: MetricId) => void;
}

// 위쪽 지표 탭에서 고른 지표가 바로 아래 그래프를 정한다.
export function MetricPanel({ dashboard, period, metricId, onMetricChange }: MetricPanelProps) {
  const metric = METRICS.find((m) => m.id === metricId) ?? METRICS[0];
  const chartPoints = dashboard.points.map((p) => ({ at: p.at, value: p[metric.id], partial: p.partial }));

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div role="tablist" aria-label="지표" className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
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
                group relative min-w-0 px-3.5 pb-4 pt-3.5 sm:px-4 text-left lg:px-5
                ${index > 0 ? "sm:border-l sm:border-line" : ""}
                ${index % 2 === 1 ? "border-l border-line" : ""}
                ${index >= 2 ? "border-t border-line sm:border-t-0" : ""}
                ${index === 0 ? "rounded-tl-xl" : ""}
              `}
            >
              <div className={`text-[13px] ${selected ? "text-ink-2" : "text-muted group-hover:text-ink-2"}`}>
                {m.label}
              </div>
              <div className="mt-1.5 flex items-center gap-2 whitespace-nowrap lg:gap-2.5">
                <span
                  className={`tabular text-[20px] font-semibold leading-8 tracking-[-0.02em] sm:text-[22px] lg:text-[26px] ${
                    selected ? "text-ink" : "text-ink-2"
                  }`}
                >
                  {m.format(dashboard.totals[m.id])}
                </span>
                <DeltaPill delta={delta} />
              </div>
              {selected && (
                <motion.span
                  layoutId="metric-underline"
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
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
  good: "bg-good/12 text-good",
  bad: "bg-bad/12 text-bad",
  flat: "bg-white/[0.06] text-muted",
};

function DeltaPill({ delta }: { delta: Delta }) {
  return (
    <span className={`tabular rounded-[5px] px-1.5 py-[3px] text-[12px] font-medium leading-none ${DELTA_TONE[delta.tone]}`}>
      {delta.text}
    </span>
  );
}
