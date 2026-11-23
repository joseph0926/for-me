// 두 개 이상 고르면 격자 아래에서 올라오는 일괄 작업 막대(tastepin 목록 선택). 개수만 바뀌면 막대는 두고 숫자만 넘긴다.
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { CloseIcon, HeartIcon, TrashIcon } from "./Icons";

interface SelectionBarProps {
  count: number;
  allFavorite: boolean;
  inTrash: boolean;
  onFavorite: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export function SelectionBar({ count, allFavorite, inTrash, onFavorite, onTrash, onRestore, onClear }: SelectionBarProps) {
  return (
    <AnimatePresence>
      {count > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md bg-[var(--raised)] py-1.5 pr-1.5 pl-4 shadow-[var(--shadow)]"
          role="toolbar"
          aria-label="고른 항목"
        >
          <span className="flex items-center overflow-hidden pr-2 font-[650] whitespace-nowrap">
            <span className="relative inline-grid h-5 overflow-hidden tabular-nums">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={count}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </span>
            개 선택
          </span>
          {inTrash ? (
            <BarButton onClick={onRestore} label="복원" />
          ) : (
            <>
              <BarButton onClick={onFavorite} label={allFavorite ? "즐겨찾기 빼기" : "즐겨찾기"} icon={<HeartIcon size={16} filled={allFavorite} />} />
              <BarButton onClick={onTrash} label="휴지통" icon={<TrashIcon size={16} />} />
            </>
          )}
          <button type="button" aria-label="선택 해제" onClick={onClear} className="grid size-8 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)]">
            <CloseIcon size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BarButton({ onClick, label, icon }: { onClick: () => void; label: string; icon?: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 whitespace-nowrap hover:bg-[var(--hover)]"
    >
      {icon}
      {label}
    </motion.button>
  );
}
