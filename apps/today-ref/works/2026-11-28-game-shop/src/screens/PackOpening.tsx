// 팩 개봉. 고른 레퍼런스 밖의 화면이라 최소한으로 둔다: 포장 하나와 열기 버튼, 열면 카드가 낮은 등급부터 뒤집힌다.
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { PackSleeve, PlayerCard } from "../art";
import { getPack, getPlayer } from "../data";
import { ease, fade, fanSettle, revealSchedule } from "../motion";
import { Button } from "../ui";

export function PackOpening({
  packId,
  playerIds,
  onClose,
  onClub,
}: {
  packId: string;
  playerIds: string[];
  onClose: () => void;
  onClub: () => void;
}) {
  const pack = getPack(packId);
  const [phase, setPhase] = useState<"sealed" | "open" | "done">("sealed");
  const openRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const cards = playerIds.map(getPlayer).sort((a, b) => a.rating - b.rating);
  const schedule = revealSchedule(cards.length);
  const best = cards[cards.length - 1];
  const lastFlip = schedule[schedule.length - 1];

  useEffect(() => openRef.current?.focus(), []);

  // 마지막 카드가 뒤집힌 뒤 버튼을 보여 준다. 창이 닫히면 타이머를 지운다.
  useEffect(() => {
    if (phase !== "open") return;
    const timeout = setTimeout(() => setPhase("done"), (lastFlip + 0.5) * 1000);
    return () => clearTimeout(timeout);
  }, [phase, lastFlip]);

  useEffect(() => {
    if (phase === "done") doneRef.current?.focus();
  }, [phase]);

  return (
    <motion.div
      {...fade}
      role="dialog"
      aria-modal="true"
      aria-labelledby="opening-title"
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "radial-gradient(80% 60% at 50% 0%, #262a33 0%, #0e0f11 70%)" }}
    >
      <div className="mx-auto flex min-h-full max-w-[1100px] flex-col items-center justify-center gap-8 px-4 py-10">
        <h2 id="opening-title" className="font-title text-[32px]">
          {pack.name}
        </h2>
        {phase === "sealed" ? (
          <>
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.26, ease }}>
              <PackSleeve pack={pack} className="h-[300px] w-[212px]" />
            </motion.div>
            <Button ref={openRef} variant="primary" className="min-w-[200px]" onClick={() => setPhase("open")}>
              열기
            </Button>
          </>
        ) : (
          <>
            {/* 카드는 장마다 14도씩 기운 부채꼴로 나와 380ms에 한 줄로 서고, 낮은 등급부터 뒤집힌다.
                가장 높은 카드가 82 이상이면 뒷면 테두리가 빛나며 예고하고, 뒤집힌 뒤 1.12배로 커진다(tastepin 팩 개봉 값). */}
            <ol className="flex flex-wrap justify-center gap-3" aria-label="받은 선수, 낮은 등급부터">
              {cards.map((player, index) => {
                const last = index === cards.length - 1;
                const tease = last && player.rating >= 82;
                return (
                  <li key={player.id} style={{ perspective: 800 }} className={last ? "z-10" : ""}>
                    <motion.div
                      initial={{ rotate: (index - (cards.length - 1) / 2) * 14, y: 60, opacity: 0 }}
                      animate={{ rotate: 0, y: 0, opacity: 1, scale: last ? [1, 1.12] : 1 }}
                      transition={{
                        rotate: { duration: fanSettle, ease },
                        y: { duration: fanSettle, ease },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.26, ease, delay: schedule[index] + 0.2 },
                      }}
                    >
                      <motion.div
                        initial={{ rotateY: 180 }}
                        animate={{ rotateY: 0 }}
                        transition={{ duration: 0.34, ease, delay: schedule[index] }}
                        className="relative [transform-style:preserve-3d]"
                      >
                        <div className="[backface-visibility:hidden]">
                          <PlayerCard player={player} />
                        </div>
                        <div
                          className={`absolute inset-0 grid place-items-center rounded-work bg-sunken ring-line [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                            tease ? "animate-[tease_1.2s_ease-in-out_infinite] ring-2 ring-accent" : "ring-1"
                          }`}
                        >
                          <span className="font-title text-[20px] text-faint">27</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </li>
                );
              })}
            </ol>
            <div className={`flex flex-col items-center gap-4 transition-opacity duration-200 ${phase === "done" ? "opacity-100" : "opacity-0"}`}>
              <p className="text-[15px] text-muted" aria-live="polite">
                {phase === "done" ? `가장 높은 선수 ${best.name} ${best.rating}. 모두 클럽에 들어갔습니다.` : ""}
              </p>
              <div className="flex gap-3">
                <Button ref={doneRef} variant="primary" disabled={phase !== "done"} onClick={onClose}>
                  상점으로
                </Button>
                <Button disabled={phase !== "done"} onClick={onClub}>
                  클럽에서 보기
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
