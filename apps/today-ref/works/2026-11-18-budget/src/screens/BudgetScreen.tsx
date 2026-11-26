// 이번 달 예산: 남은 예산 띠와 분류별 진행 막대. 막대의 세로 눈금은 이번 달이 지난 만큼의 위치다.
import { motion } from "motion/react";

import { CategoryDot } from "../components/CategoryDot";
import { type Entry, TODAY, findCategory, monthlyBudgets } from "../data";
import { parseDateKey } from "../dates";
import { expenseByCategory, inMonth, monthElapsedRatio, won } from "../ledger";
import { easeOut } from "../motion";

type Pace = "steady" | "fast" | "over";

function paceOf(spent: number, limit: number, elapsed: number, fixed: boolean): Pace {
  if (spent > limit) return "over";
  if (!fixed && spent / limit > elapsed) return "fast";
  return "steady";
}

const paceColor: Record<Pace, string> = {
  steady: "var(--accent)",
  fast: "var(--warn)",
  over: "var(--expense)",
};

export function BudgetScreen({ entries }: { entries: Entry[] }) {
  const { year, month, day } = parseDateKey(TODAY);
  const spentByCategory = expenseByCategory(inMonth(entries, year, month));
  const elapsed = monthElapsedRatio(TODAY);

  const rows = monthlyBudgets.map((budget) => ({
    ...budget,
    spent: spentByCategory.get(budget.categoryId) ?? 0,
  }));
  const totalLimit = rows.reduce((total, row) => total + row.limit, 0);
  const totalSpent = rows.reduce((total, row) => total + row.spent, 0);
  const left = totalLimit - totalSpent;

  return (
    <div className="h-full overflow-y-auto pb-6">
      <header className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">{month}월 예산</h1>
      </header>

      <section className="mx-4 mt-3 rounded-[6px] bg-[var(--band)] px-5 py-4 text-[var(--band-ink)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] opacity-75">{left >= 0 ? "남은 예산" : "넘은 예산"}</span>
          <span className="text-[24px] font-bold">{won(Math.abs(left))}</span>
        </div>
        <ProgressBar ratio={totalSpent / totalLimit} elapsed={elapsed} color="#ffffff" track="rgb(255 255 255 / 0.18)" tick="#ffffff" />
        <div className="mt-2 flex justify-between text-[12px] opacity-75">
          <span>{won(totalSpent)} 사용</span>
          <span>
            {day}일 지남, 예산 {won(totalLimit)}
          </span>
        </div>
      </section>

      <ul className="mt-5">
        {rows.map((row) => {
          const pace = paceOf(row.spent, row.limit, elapsed, row.fixed ?? false);
          const remaining = row.limit - row.spent;
          return (
            <li key={row.categoryId} className="px-5 py-[11px]">
              <div className="flex items-center gap-2.5">
                <CategoryDot categoryId={row.categoryId} />
                <span className="flex-1 text-[15px] font-medium">
                  {findCategory(row.categoryId).name}
                  {row.fixed && <span className="ml-1.5 text-[12px] font-normal text-[var(--muted)]">고정비</span>}
                </span>
                <span className="text-[15px] font-semibold" style={{ color: pace === "over" ? "var(--expense)" : undefined }}>
                  {remaining >= 0 ? `${won(remaining)} 남음` : `${won(-remaining)} 초과`}
                </span>
              </div>
              <ProgressBar ratio={row.spent / row.limit} elapsed={elapsed} color={paceColor[pace]} track="var(--panel)" tick="var(--ink)" />
              <div className="mt-1.5 flex justify-between text-[12px] text-[var(--muted)]">
                <span>
                  {won(row.spent)} 사용
                  {pace === "fast" && <span className="ml-1.5 font-medium text-[var(--warn)]">속도 빠름</span>}
                </span>
                <span>예산 {won(row.limit)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProgressBar({
  ratio,
  elapsed,
  color,
  track,
  tick,
}: {
  ratio: number;
  elapsed: number;
  color: string;
  track: string;
  tick: string;
}) {
  return (
    <div className="relative mt-2.5 h-2 rounded-full" style={{ background: track }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
        transition={{ duration: 0.6, ease: easeOut }}
      />
      <span
        aria-hidden
        className="absolute -top-1 h-4 w-0.5 rounded-full"
        style={{ left: `calc(${elapsed * 100}% - 1px)`, background: tick }}
      />
    </div>
  );
}
