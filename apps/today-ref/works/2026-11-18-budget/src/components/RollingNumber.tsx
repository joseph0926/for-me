// 숫자가 바뀌면 세로로 넘긴다(tastepin 숫자 바뀜 값). 늘면 새 숫자가 아래 10px에서 올라오고 이전 숫자는 위로 나가며,
// 줄면 반대로 움직인다. 두 숫자는 같은 칸에 겹쳐 200ms 동안 교차한다.
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";

import { easeOutQuint } from "../motion";

const variants = {
  enter: (direction: number) => ({ opacity: 0, y: 10 * direction }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({ opacity: 0, y: -10 * direction }),
};

export function RollingNumber({
  value,
  format,
  className,
  style,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const previous = useRef(value);
  const direction = value >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = value;
  }, [value]);

  return (
    <span className={`inline-grid ${className ?? ""}`} style={style}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: easeOutQuint }}
          className="truncate [grid-area:1/1]"
        >
          {format(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
