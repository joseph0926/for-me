// 알림(tastepin 토스트): 오른쪽 아래 24px, 휴대폰은 아래 가운데. 최신 것만 온전히 보이고 이전 것은 뒤로 8px씩 밀리며 0.94배씩 작아진다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import { CloseIcon } from "./Icons";

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export const maxToasts = 3;
const visibleMs = 4200;
const ease = [0.25, 0.1, 0.25, 1] as const;

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] sm:right-6 sm:bottom-6 sm:left-auto" aria-live="polite">
      <div className="relative mx-auto h-0 w-full max-w-[360px] sm:mx-0 sm:w-[360px]">
        <AnimatePresence>
          {toasts.map((toast, index) => {
            const depth = toasts.length - 1 - index;
            return <ToastCard key={toast.id} toast={toast} depth={depth} onDismiss={onDismiss} />;
          })}
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
      initial={{ opacity: 0, y: 16, scale: 1 }}
      animate={{ opacity: depth > 0 ? 0.9 : 1, y: -depth * 8, scale: 1 - depth * 0.06 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease }}
      style={{ zIndex: 10 - depth }}
      className="pointer-events-auto absolute right-0 bottom-0 left-0 flex origin-bottom items-center gap-2 rounded-md bg-[#23272e] py-2.5 pr-2 pl-4 text-[14px] text-white shadow-[var(--shadow)]"
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss(toast.id);
          }}
          className="h-8 shrink-0 rounded-md px-2.5 font-[650] text-white underline-offset-2 hover:bg-white/10"
        >
          되돌리기
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
