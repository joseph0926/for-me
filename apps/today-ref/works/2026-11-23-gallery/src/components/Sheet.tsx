// 좁은 화면에서 아래에서 올라오는 시트(tastepin 드로어): 내용 높이만큼, 최대 85%. 곡선 300ms로 들어오고 같은 길로 나간다.
import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const ease = [0.2, 0, 0, 1] as const;

export function Sheet({ label, onClose, raised = false, className = "", children }: {
  label: string;
  onClose: () => void;
  // 크게 보기(z-30) 위에 띄울 때 켠다.
  raised?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // 넓은 화면에서는 className의 md:hidden, lg:hidden으로 시트가 숨어 있어도 그려져 있다.
      // 숨은 시트가 Esc를 받으면 옆 정보 패널이 닫히므로 화면에 보일 때만 닫는다.
      if (event.key === "Escape" && (root.current?.getClientRects().length ?? 0) > 0) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div ref={root} className={`fixed inset-0 ${raised ? "z-40" : "z-20"} ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        className="absolute inset-0 bg-black/[0.18]"
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease }}
        className="absolute right-0 bottom-0 left-0 flex max-h-[85dvh] flex-col rounded-t-md bg-[var(--panel)] shadow-[var(--shadow)]"
      >
        <button type="button" aria-label={`${label} 닫기`} onClick={onClose} className="grid h-6 shrink-0 place-items-center">
          <span className="h-1 w-10 rounded-full bg-[var(--faint)]/60" />
        </button>
        <div className="min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] thin-scroll">{children}</div>
      </motion.section>
    </div>
  );
}
