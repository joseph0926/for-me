// 아래에서 올라오는 시트. 바깥을 누르거나 Esc로 닫고, 손잡이와 제목 줄을 아래로 끌어도 닫는다.
import { motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { sheet } from "../motion";

// 이만큼 끌어 내리거나 빠르게 내리면 닫고, 덜 끌면 제자리로 돌아온다
const closeDistance = 80;
const closeVelocity = 500;

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > closeDistance || info.velocity.y > closeVelocity) onClose();
  }

  return (
    <div className="absolute inset-0 z-40">
      <motion.button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/[0.18]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={sheet}
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-hidden rounded-t-work bg-raised"
        style={{ boxShadow: "var(--shadow)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={sheet}
        // 목록 스크롤과 입력을 막지 않도록 끌기는 손잡이와 제목 줄에서만 시작한다
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        // 덜 끌고 놓았을 때 제자리로 돌아오는 움직임. 임계 감쇠보다 조금 크게 둬 위로 튀어 넘지 않는다.
        dragTransition={{ bounceStiffness: 600, bounceDamping: 50 }}
        onDragEnd={onDragEnd}
      >
        <div className="touch-none" onPointerDown={(event) => drag.start(event)}>
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line" aria-hidden="true" />
          <h2 className="px-5 pt-3 pb-2 text-[17px] font-bold">{title}</h2>
        </div>
        <div className="scroll-area max-h-[60vh] pb-4">{children}</div>
      </motion.section>
    </div>
  );
}
