// 탭 내용 바꾸기. 오른쪽 탭으로 가면 새 내용이 오른쪽 12px에서, 왼쪽 탭이면 왼쪽에서 180ms에 들어온다(tastepin 탭 패널 전환).
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { easeOutCubic } from "../motion";

export function TabPanel({ order, current, children }: { order: readonly string[]; current: string; children: ReactNode }) {
  // 탭이 바뀐 렌더에서만 방향을 갱신하는 파생 상태다.
  const [shown, setShown] = useState({ current, direction: 1 });
  if (shown.current !== current) setShown({ current, direction: order.indexOf(current) > order.indexOf(shown.current) ? 1 : -1 });

  return (
    <AnimatePresence mode="popLayout" initial={false} custom={shown.direction}>
      <motion.div
        key={current}
        custom={shown.direction}
        variants={{
          enter: (direction: number) => ({ x: direction * 12, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (direction: number) => ({ x: -direction * 12, opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.18, ease: easeOutCubic }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
