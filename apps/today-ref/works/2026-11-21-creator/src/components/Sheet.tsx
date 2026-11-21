import { motion } from "motion/react";
import type { ReactNode } from "react";

// 아래에서 올라오는 시트. 바깥을 누르면 닫는다. 열고 닫는 판단은 부모의 AnimatePresence가 한다.
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <motion.button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="relative flex max-h-[92%] flex-col rounded-t-[22px] bg-surface"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
      >
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        {children}
      </motion.div>
    </div>
  );
}
