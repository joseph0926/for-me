// 수가 바뀌면 세로로 넘긴다. 늘면 새 수가 아래 10px에서 올라오고, 줄면 위에서 내려온다(tastepin 숫자 바뀜).
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { compactCount } from "../format";
import { easeOutQuint } from "../motion";

export function RollingNumber({ value, className = "" }: { value: number; className?: string }) {
  // 이전 값과 비교해 방향을 정한다. 값이 바뀐 렌더에서만 갱신하는 파생 상태다.
  const [shown, setShown] = useState({ value, direction: 1 });
  if (shown.value !== value) setShown({ value, direction: value > shown.value ? 1 : -1 });
  const offset = 10 * shown.direction;

  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={offset}>
        <motion.span
          key={value}
          custom={offset}
          variants={{
            enter: (y: number) => ({ y, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (y: number) => ({ y: -y, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: easeOutQuint }}
        >
          {compactCount(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
