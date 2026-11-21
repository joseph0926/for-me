import { motion, useIsPresent } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { CloseIcon } from "./Icons";

// 넓은 화면에서는 가운데 대화상자, 좁은 화면에서는 아래에서 올라오는 시트. Esc와 바깥 클릭으로 닫는다.
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // 닫히는 애니메이션이 시작되면 바로 클릭을 아래 화면으로 넘긴다.
  const isPresent = useIsPresent();
  const interactive = isPresent ? "pointer-events-auto" : "pointer-events-none";
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // 바깥 틀은 배치만 맡고 클릭은 배경과 창이 받는다.
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        className={`${interactive} absolute inset-0 bg-black/50`}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className={`${interactive} relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-2xl sm:max-w-[460px] sm:rounded-2xl`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      >
        <header className="flex h-14 shrink-0 items-center border-b border-line pl-5 pr-2">
          <h2 className="flex-1 text-[16px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-10 place-items-center rounded-full hover:bg-sunken">
            <CloseIcon size={20} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}
