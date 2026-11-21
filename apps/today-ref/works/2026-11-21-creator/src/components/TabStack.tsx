import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { screenKey, type Screen } from "../navigation";

// 새 화면은 오른쪽에서 밀려 들어오고, 아래 화면은 왼쪽으로 조금 비켜난다.
const pushTransition = { type: "tween", duration: 0.4, ease: [0.32, 0.72, 0, 1] } as const;
const COVERED_OFFSET = "-26%";

export function TabStack({
  isActive,
  root,
  stack,
  renderScreen,
}: {
  isActive: boolean;
  root: ReactNode;
  stack: Screen[];
  renderScreen: (screen: Screen) => ReactNode;
}) {
  return (
    // 다른 탭으로 가도 스크롤 위치와 쌓인 화면을 지키도록 숨기기만 한다.
    <div className={isActive ? "absolute inset-0" : "hidden"}>
      <motion.div
        className="absolute inset-0 bg-surface"
        animate={{ x: stack.length > 0 ? COVERED_OFFSET : 0 }}
        transition={pushTransition}
      >
        {root}
      </motion.div>
      <AnimatePresence initial={false}>
        {stack.map((screen, depth) => (
          <motion.div
            key={screenKey(screen, depth)}
            className="absolute inset-0 bg-surface shadow-[-12px_0_32px_-12px_rgb(0_0_0/0.2)]"
            initial={{ x: "100%" }}
            animate={{ x: depth < stack.length - 1 ? COVERED_OFFSET : 0 }}
            exit={{ x: "100%" }}
            transition={pushTransition}
          >
            {renderScreen(screen)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
