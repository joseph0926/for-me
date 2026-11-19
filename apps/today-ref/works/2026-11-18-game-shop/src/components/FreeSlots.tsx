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

export function FreeSlots({ slots, onClaim }: { slots: FreeSlot[]; onClaim: (index: number) => void }) {
  const now = useNow(1000);
  const timers = slots.flatMap((slot, index) => slot.kind === "timer" ? [{ index, readyAt: slot.readyAt }] : []);
  timers.sort((a, b) => a.readyAt - b.readyAt);
  const ready = timers.filter((slot) => slot.readyAt <= now);
  const waiting = timers.filter((slot) => slot.readyAt > now);
  const next = ready[0];

  return (
    <section aria-labelledby="free-rewards" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="free-rewards" className="text-xl font-bold">무료 보상</h2>
        <span role="status" className="text-xs font-semibold text-muted">수령 가능 {ready.length}팩</span>
      </div>
      <div className={`mt-3 flex min-h-14 items-stretch border-l-2 ${next ? "border-accent bg-panel text-ink" : "border-line bg-panel text-muted"}`}>
        <div className="grid w-12 shrink-0 place-items-center text-muted">
          <Icon name="packs" className="size-6" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2 px-3">
          <span className="text-sm font-bold">선수 카드 {freePack.size}장</span>
          {next ? (
            <button
              type="button"
              aria-label="무료 보상 팩 열기"
              onClick={() => onClaim(next.index)}
              className="h-11 bg-accent px-5 text-sm font-bold text-surface transition hover:bg-white"
            >
              팩 열기
            </button>
          ) : (
            <span className="text-xs font-semibold text-muted">대기 중</span>
          )}
        </div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {waiting.map((slot, index) => (
          <li key={slot.index} className="flex min-h-8 items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 text-muted">
              <Icon name="clock" className="size-3.5" />{index === 0 ? "다음 팩" : "대기 팩"}
            </span>
            <span className="font-mono font-medium text-ink tabular">{formatCountdown(slot.readyAt - now)}</span>
          </li>
        ))}
        {slots.map((slot, index) => slot.kind === "locked" && (
          <li key={`lock-${index}`} className="flex min-h-8 items-center justify-between gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-2"><Icon name="lock" className="size-3.5" />잠긴 팩</span>
            <span>단계 {slot.unlockLevel}에 열림</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
