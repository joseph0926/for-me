import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useMediaQuery } from "../hooks";

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

/**
 * 검색창과 예약 상자 아래에 펼치는 패널. 640px 미만에서 sheet이면 화면 아래에서 올라오는 시트로 바뀐다.
 * 위치는 부모(relative)를 기준으로 placement 클래스가 정한다.
 * 패널은 위 4px에서 160ms에 내려오고, 시트는 화면 아래 가장자리에서 300ms에 올라온다. 둘 다 같은 길로 닫힌다.
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
  const phone = useMediaQuery("(max-width: 639px)");
  const asSheet = sheet && phone;
  const frame = sheet
    ? "fixed inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-md border-t sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-none sm:overflow-visible sm:rounded-md sm:border"
    : "absolute top-full mt-2 rounded-md border";
  const motionProps = asSheet
    ? {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: 0.3, ease: EASE_OUT_CUBIC },
      }
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.16, ease: EASE_OUT_CUBIC },
      };

  return (
    <>
      {sheet && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
        />
      )}
      <motion.div
        role="dialog"
        aria-label={label}
        {...motionProps}
        className={`z-50 border-line bg-white p-5 shadow-[0_12px_40px_-12px_rgb(20_20_30/0.25)] ${frame} ${placement}`}
      >
        {children}
      </motion.div>
    </>
  );
}
