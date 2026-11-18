import { useEffect, useState } from "react";

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

export function FreeSlots({ slots, onClaim }: { slots: FreeSlot[]; onClaim: (index: number) => void }) {
  const now = useNow(1000);
  const readyCount = slots.filter((slot) => slot.kind === "timer" && slot.readyAt <= now).length;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold">무료 보상</h2>
        <span className="text-[12px] text-muted tabular">{readyCount > 0 ? `${readyCount}개 열 수 있음` : "다음 보상을 기다리는 중"}</span>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {slots.map((slot, index) => {
          if (slot.kind === "locked") {
            return (
              <li key={index} className="flex flex-col items-center gap-2">
                <span className="grid aspect-square w-full max-w-20 place-items-center rounded-full border border-dashed border-line text-muted">
                  <Icon name="lock" className="size-6" />
                </span>
                <span className="text-[12px] text-muted">단계 {slot.unlockLevel}</span>
              </li>
            );
          }
          const ready = slot.readyAt <= now;
          return (
            <li key={index} className="flex flex-col items-center gap-2">
              {ready ? (
                <button
                  type="button"
                  onClick={() => onClaim(index)}
                  aria-label="무료 보상 팩 열기"
                  className="relative grid aspect-square w-full max-w-20 place-items-center rounded-full bg-accent text-sm font-bold text-white shadow-[0_0_24px_rgb(76_141_255/0.55)] transition hover:brightness-110"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent/30 [animation-duration:2s]" />
                  <span className="relative">열기</span>
                </button>
              ) : (
                <span className="grid aspect-square w-full max-w-20 place-items-center rounded-full border border-line bg-panel-raised text-muted">
                  <Icon name="clock" className="size-6" />
                </span>
              )}
              <span className={`text-[12px] tabular ${ready ? "font-semibold text-accent" : "text-muted"}`}>
                {ready ? "받을 수 있음" : formatCountdown(slot.readyAt - now)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
