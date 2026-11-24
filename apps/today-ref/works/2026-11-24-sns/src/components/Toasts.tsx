// 알림(tastepin 토스트): 오른쪽 아래 24px, 휴대폰은 아래 가운데 탭 막대 위. 최신 것만 온전히 보이고 이전 것은 뒤로 8px씩 밀리며 0.94배씩 작아진다. 3개까지.
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import type { ToastAction } from "../app-context";
import { CloseIcon } from "./Icons";

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

export const maxToasts = 3;
const visibleMs = 4200;
const ease = [0.25, 0.1, 0.25, 1] as const;

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 z-[60] md:right-6 md:bottom-6 md:left-auto"
      aria-live="polite"
    >
      <div className="relative mx-auto h-0 w-full max-w-[360px] md:mx-0 md:w-[360px]">
        <AnimatePresence>
          {toasts.map((toast, index) => (
            <ToastCard key={toast.id} toast={toast} depth={toasts.length - 1 - index} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastCard({ toast, depth, onDismiss }: { toast: Toast; depth: number; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), visibleMs);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: depth > 0 ? 0.9 : 1, y: -depth * 8, scale: 1 - depth * 0.06 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease }}
      style={{ zIndex: 10 - depth }}
      className="pointer-events-auto absolute right-0 bottom-0 left-0 flex origin-bottom items-center gap-2 rounded-md bg-[#202327] py-2 pr-2 pl-4 text-[14px] text-white shadow-[var(--shadow)]"
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            onDismiss(toast.id);
          }}
          className="h-8 shrink-0 rounded-md px-2.5 font-[650] text-white hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => onDismiss(toast.id)}
        className="grid size-8 shrink-0 place-items-center rounded-md text-white/60 hover:bg-white/10"
      >
        <CloseIcon size={14} />
      </button>
    </motion.div>
  );
}
