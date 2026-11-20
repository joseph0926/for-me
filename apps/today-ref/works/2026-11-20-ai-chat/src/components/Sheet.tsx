// 화면 아래에서 올라오는 시트. 모델 선택과 출처 목록이 함께 쓴다.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Icon } from "./Icon";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-40">
      <motion.button
        type="button"
        aria-label={`${title} 닫기`}
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="dialog"
        aria-label={title}
        className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[78%] overflow-y-auto rounded-t-[22px] bg-surface px-2 pt-2 pb-5 shadow-[0_-8px_30px_rgb(0_0_0/12%)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
      >
        <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-raised-2" aria-hidden="true" />
        <div className="flex items-center justify-between px-3 py-1.5">
          <h2 className="text-[16px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-9 place-items-center rounded-full text-muted">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
