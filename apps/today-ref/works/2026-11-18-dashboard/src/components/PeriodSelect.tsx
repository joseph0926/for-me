import { motion } from "motion/react";

import { PERIODS, type PeriodId } from "../data";
import { SPRING } from "../motion";

// 기간은 대시보드의 하나뿐인 단일 선택이라 드롭다운 뒤에 숨기지 않고 세 값을 늘 보이게 둔다
// (tastepin 규칙: 하나뿐인 선택을 드롭다운 팝업 뒤에 숨기지 않는다). 고른 값은 사이드바 현재 위치와 같은 옅은 면으로 표시한다.
export function PeriodSelect({ value, onChange }: { value: PeriodId; onChange: (period: PeriodId) => void }) {
  return (
    <div role="group" aria-label="기간" className="flex h-7 items-stretch rounded-md border border-line p-0.5">
      {PERIODS.map((period) => {
        const selected = period.id === value;
        return (
          <button
            key={period.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(period.id)}
            className={`press relative isolate rounded-[4px] px-2.5 text-[13px] ${
              selected ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="period-tone"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[4px] bg-raised"
                transition={SPRING}
              />
            )}
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
