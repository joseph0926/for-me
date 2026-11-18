// 이번 달 분석: 지난달 같은 기간과의 비교 문장, 두 달의 누적 지출선, 분류별 비율.
import { motion } from "motion/react";

import { CategoryDot } from "../components/CategoryDot";
import { type Entry, TODAY, findCategory } from "../data";
import { daysInMonth, parseDateKey, shiftMonth } from "../dates";
import { cumulativeExpense, expenseByCategory, inMonth, plain, won } from "../ledger";

export function AnalysisScreen({ entries }: { entries: Entry[] }) {
  const { year, month, day } = parseDateKey(TODAY);
  const previous = shiftMonth(year, month, -1);
  const previousLastDay = daysInMonth(previous.year, previous.month);

  const thisMonth = cumulativeExpense(entries, year, month, day);
  const lastMonth = cumulativeExpense(entries, previous.year, previous.month, previousLastDay);
  const thisTotal = thisMonth[day - 1] ?? 0;
  // 지난달이 오늘 날짜보다 짧으면 지난달 마지막 날까지와 비교한다.
  const lastSamePeriod = lastMonth[Math.min(day, previousLastDay) - 1] ?? 0;
  const difference = thisTotal - lastSamePeriod;

  const shares = [...expenseByCategory(inMonth(entries, year, month))]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="h-full overflow-y-auto pb-6">
      <header className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">{month}월 분석</h1>
      </header>

      <section className="px-5 pt-4">
        <p className="text-[15px] text-[var(--muted)]">지난달 같은 기간보다</p>
        <p className="text-[24px] font-bold leading-snug">
          <span style={{ color: difference > 0 ? "var(--expense)" : "var(--accent)" }}>{won(Math.abs(difference))}</span>{" "}
          {difference > 0 ? "더 썼어요" : "덜 썼어요"}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-[var(--panel)] px-3 py-2.5">
            <dt className="text-[var(--muted)]">
              {month}월 1일~{day}일
            </dt>
            <dd className="mt-0.5 text-[16px] font-semibold">{won(thisTotal)}</dd>
          </div>
          <div className="rounded-xl bg-[var(--panel)] px-3 py-2.5">
            <dt className="text-[var(--muted)]">
              {previous.month}월 1일~{Math.min(day, previousLastDay)}일
            </dt>
            <dd className="mt-0.5 text-[16px] font-semibold">{won(lastSamePeriod)}</dd>
          </div>
        </dl>
      </section>

      <CumulativeChart
        current={thisMonth}
        previous={lastMonth}
        currentLabel={`${month}월`}
        previousLabel={`${previous.month}월`}
      />

      <section className="mt-2 border-t-8 border-[var(--panel)] pt-4">
        <h2 className="px-5 text-[15px] font-semibold">어디에 썼나요</h2>
        <ul className="mt-2">
          {shares.map((share) => {
            const ratio = thisTotal > 0 ? share.amount / thisTotal : 0;
            const category = findCategory(share.categoryId);
            return (
              <li key={share.categoryId} className="flex items-center gap-3 px-5 py-2.5">
                <CategoryDot categoryId={share.categoryId} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span className="font-medium">
                      {category.name}
                      <span className="ml-1.5 text-[12px] text-[var(--muted)]">{Math.round(ratio * 100)}%</span>
                    </span>
                    <span className="font-semibold">{plain(share.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[var(--panel)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: category.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

const chart = { width: 353, height: 168, left: 6, right: 44, top: 14, bottom: 22 };

function CumulativeChart({
  current,
  previous,
  currentLabel,
  previousLabel,
}: {
  current: number[];
  previous: number[];
  currentLabel: string;
  previousLabel: string;
}) {
  const days = Math.max(previous.length, 31);
  // 눈금이 50만 원 단위로 떨어지도록 위쪽 끝을 올린다.
  const tickStep = 500_000;
  const maxValue = Math.ceil(Math.max(...current, ...previous, 1) / tickStep) * tickStep;
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const x = (dayIndex: number) => chart.left + (dayIndex / (days - 1)) * plotWidth;
  const y = (value: number) => chart.top + plotHeight - (value / maxValue) * plotHeight;
  const path = (values: number[]) => values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join(" ");

  const lastIndex = current.length - 1;
  const gridValues = Array.from({ length: maxValue / tickStep }, (_, index) => (index + 1) * tickStep);
  const area = lastIndex >= 0 ? `${path(current)} L${x(lastIndex)},${y(0)} L${x(0)},${y(0)} Z` : "";

  return (
    <figure className="mt-4 px-5">
      <figcaption className="flex gap-4 text-[12px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[var(--accent)]" />
          {currentLabel} 누적
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-[var(--faint)]" />
          {previousLabel} 누적
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="mt-2 w-full" role="img" aria-label={`${currentLabel}과 ${previousLabel} 누적 지출 비교`}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={chart.left} x2={chart.left + plotWidth} y1={y(value)} y2={y(value)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={chart.width - 2} y={y(value) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {Math.round(value / 10_000)}만
            </text>
          </g>
        ))}
        <line x1={chart.left} x2={chart.left + plotWidth} y1={y(0)} y2={y(0)} stroke="var(--line)" />
        {[1, 10, 20, 30].map((day) => (
          <text key={day} x={x(day - 1)} y={chart.height - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">
            {day}일
          </text>
        ))}
        <motion.path
          d={area}
          fill="var(--accent)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.16 }}
          transition={{ duration: 0.8 }}
        />
        <path d={path(previous)} fill="none" stroke="var(--faint)" strokeWidth="1.8" strokeDasharray="4 4" strokeLinejoin="round" />
        <motion.path
          d={path(current)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {lastIndex >= 0 && (
          <circle cx={x(lastIndex)} cy={y(current[lastIndex])} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
        )}
      </svg>
    </figure>
  );
}
