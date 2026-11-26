import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

export function Modal({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    // tastepin 게임 상점 모달 값: 뒤 화면을 8px 흐리게 하고 검정 40%로 덮는다. 창은 0.96배에서 200ms에 커지며
    // 나타나고 닫을 때 같은 길로 줄며 사라진다.
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[8px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`w-full rounded-md bg-panel shadow-2xl ${wide ? "max-w-3xl" : "max-w-md"}`}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
