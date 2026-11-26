// 화면 아래에서 올라오는 시트. 모델 선택과 출처 목록이 함께 쓴다.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { panel } from "../motion";
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
        transition={panel}
      />
      <motion.div
        role="dialog"
        aria-label={title}
        className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[78%] overflow-y-auto rounded-t-md bg-surface px-2 pt-3 pb-5 shadow-[0_-8px_30px_rgb(0_0_0/12%)]"
        // 바텀 시트는 스프링 없이 300ms 곡선으로 올라오고 같은 길로 내려간다(tastepin 드로어 예외).
        // 끌어서 닫지 않으므로 손잡이 막대는 두지 않고 닫기 버튼과 바깥 누르기로 닫는다.
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={panel}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          <h2 className="text-[16px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="icon-btn text-muted">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
