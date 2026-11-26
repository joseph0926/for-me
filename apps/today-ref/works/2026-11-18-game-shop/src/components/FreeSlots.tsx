import { useEffect, useState } from "react";

import { freePack } from "../data";
import { formatCountdown } from "../format";
import type { FreeSlot } from "../shop";
import { Icon } from "./Icon";

// 남은 시간을 1초마다 다시 그린다. 이 칸만 다시 그리도록 상점 전체가 아니라 여기서 시계를 돌린다.
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const ring = { size: 64, stroke: 4 };
const circumference = 2 * Math.PI * ((ring.size - ring.stroke) / 2);

// 원형 타이머 칸(tastepin 게임 상점 무료 보상 값). 기다리는 칸은 지난 시간만큼 채워진 원 안에 남은 시간을,
// 받을 수 있는 칸은 가득 찬 원을, 잠긴 칸은 자물쇠와 조건을 두고 칸마다 아래에 버튼을 둔다.
function Ring({ filled, children }: { filled: number; children: React.ReactNode }) {
  const radius = (ring.size - ring.stroke) / 2;
  return (
    <div className="relative grid size-16 place-items-center">
      <svg viewBox={`0 0 ${ring.size} ${ring.size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={ring.size / 2} cy={ring.size / 2} r={radius} fill="none" stroke="var(--panel-raised)" strokeWidth={ring.stroke} />
        <circle
          cx={ring.size / 2}
          cy={ring.size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={ring.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      <span className="relative text-[12px] font-semibold tabular">{children}</span>
    </div>
  );
}

export function FreeSlots({ slots, onClaim }: { slots: FreeSlot[]; onClaim: (index: number) => void }) {
  const now = useNow(1000);
  const readyCount = slots.filter((slot) => slot.kind === "timer" && slot.readyAt <= now).length;

  return (
    <section aria-labelledby="free-rewards" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="free-rewards" className="text-xl font-bold">무료 보상</h2>
        <span role="status" className="text-[13px] text-muted">
          {freePack.name}, 선수 {freePack.size}명
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2" aria-label={`받을 수 있는 칸 ${readyCount}개`}>
        {slots.map((slot, index) => {
          if (slot.kind === "locked") {
            return (
              <li key={index} className="flex flex-col items-center gap-2">
                <Ring filled={0}>
                  <Icon name="lock" className="size-5 text-muted" />
                </Ring>
                <span className="text-[12px] text-muted">단계 {slot.unlockLevel}</span>
                <button type="button" disabled className="btn btn-secondary w-full px-2 text-[13px]">
                  잠김
                </button>
              </li>
            );
          }
          const remaining = slot.readyAt - now;
          const ready = remaining <= 0;
          const filled = ready ? 1 : Math.max(0, (now - slot.since) / (slot.readyAt - slot.since));
          return (
            <li key={index} className="flex flex-col items-center gap-2">
              <Ring filled={filled}>{ready ? <Icon name="check" className="size-5 text-accent" /> : null}</Ring>
              <span className={`text-[12px] tabular ${ready ? "text-ink" : "text-muted"}`}>
                {ready ? "받을 수 있음" : formatCountdown(remaining)}
              </span>
              {ready ? (
                <button
                  type="button"
                  aria-label={`${freePack.name} 받기`}
                  onClick={() => onClaim(index)}
                  className="btn btn-accent w-full px-2 text-[13px]"
                >
                  받기
                </button>
              ) : (
                <button type="button" disabled className="btn btn-secondary w-full px-2 text-[13px]">
                  대기 중
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
