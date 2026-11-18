import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * 검색창과 예약 상자 아래에 펼치는 패널. 640px 미만에서 sheet이면 화면 아래에서 올라오는 시트로 바뀐다.
 * 위치는 부모(relative)를 기준으로 placement 클래스가 정한다.
 */
export function Popover({
  placement,
  sheet = false,
  onClose,
  label,
  children,
}: {
  placement: string;
  sheet?: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const frame = sheet
    ? "fixed inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-none sm:overflow-visible sm:rounded-xl sm:border"
    : "absolute top-full mt-2 rounded-xl border";

  return (
    <>
      {sheet && <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={onClose} aria-hidden="true" />}
      <motion.div
        role="dialog"
        aria-label={label}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={`z-50 border-line bg-white p-5 shadow-[0_12px_40px_-12px_rgb(20_20_30/0.25)] ${frame} ${placement}`}
      >
        {children}
      </motion.div>
    </>
  );
}
