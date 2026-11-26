import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { EASE_OUT_QUINT } from "../motion";

// 숫자가 바뀌면 세로로 넘긴다(tastepin 숫자 바뀜 값). 늘면 새 숫자가 아래 10px에서 올라오고 이전 숫자는 위로 나가며,
// 줄면 반대로 움직인다. 두 숫자는 같은 칸에 겹쳐 200ms에 교차한다.
export function RollingNumber({ value, text, className }: { value: number; text: string; className?: string }) {
  // 직전 값과 비교한 방향을 렌더 중에 맞춘다. ref를 렌더 중에 고치면 StrictMode의 두 번 렌더에서 방향을 잃는다.
  const [last, setLast] = useState({ value, direction: 1 });
  if (last.value !== value) setLast({ value, direction: value > last.value ? 1 : -1 });
  const direction = last.value !== value ? (value > last.value ? 1 : -1) : last.direction;

  return (
    <span className={`inline-grid overflow-hidden ${className ?? ""}`}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.span
          key={text}
          custom={direction}
          className="col-start-1 row-start-1"
          variants={{
            enter: (d: number) => ({ y: 10 * d, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            leave: (d: number) => ({ y: -10 * d, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="leave"
          transition={{ duration: 0.2, ease: EASE_OUT_QUINT }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
