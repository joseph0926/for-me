// 두 개 이상 고르면 격자 아래에서 올라오는 일괄 작업 막대(tastepin 사진 갤러리 여러 장 고르기: 아래에서 떠오르는 둥근 막대,
// 개수와 옮기기, 즐겨찾기, 휴지통, 해제). 개수만 바뀌면 막대는 두고 숫자만 넘긴다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { CloseIcon, FolderIcon, HeartIcon, RestoreIcon, TrashIcon } from "./Icons";
import { MenuList } from "./MenuList";

interface SelectionBarProps {
  count: number;
  allFavorite: boolean;
  inTrash: boolean;
  folders: readonly string[];
  // 고른 항목이 모두 같은 폴더에 있으면 그 폴더. 옮기기 메뉴에서 그 줄을 막는다.
  sharedFolder: string | undefined;
  onMove: (folder: string) => void;
  onFavorite: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onClear: () => void;
}

const ease = [0.215, 0.61, 0.355, 1] as const;

export function SelectionBar({ count, allFavorite, inTrash, folders, sharedFolder, onMove, onFavorite, onTrash, onRestore, onClear }: SelectionBarProps) {
  return (
    <AnimatePresence>
      {count > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease }}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[var(--raised)] py-1.5 pr-1.5 pl-4 shadow-[var(--shadow)]"
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
            <BarButton onClick={onRestore} label="복원" icon={<RestoreIcon size={16} />} />
          ) : (
            <>
              <MoveButton folders={folders} sharedFolder={sharedFolder} onMove={onMove} />
              <BarButton onClick={onFavorite} label={allFavorite ? "즐겨찾기 빼기" : "즐겨찾기"} icon={<HeartIcon size={16} filled={allFavorite} />} />
              <BarButton onClick={onTrash} label="휴지통" icon={<TrashIcon size={16} />} />
            </>
          )}
          <button type="button" aria-label="선택 해제" onClick={onClear} className="grid size-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--hover)]">
            <CloseIcon size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BarButton({ onClick, label, icon, expanded }: { onClick: () => void; label: string; icon?: ReactNode; expanded?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      aria-expanded={expanded}
      className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap hover:bg-[var(--hover)] ${expanded ? "bg-[var(--hover)]" : ""}`}
    >
      {icon}
      {/* 휴대폰 너비에서는 막대가 화면을 넘지 않게 아이콘만 보이고 이름은 화면 읽기에 남긴다. */}
      <span className={icon ? "max-sm:sr-only" : ""}>{label}</span>
    </motion.button>
  );
}

// 옮길 폴더는 막대 위로 펼치는 메뉴에서 고른다. 오른쪽 클릭 메뉴의 "폴더로 이동"과 같은 목록이다.
function MoveButton({ folders, sharedFolder, onMove }: { folders: readonly string[]; sharedFolder: string | undefined; onMove: (folder: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    // 메뉴만 닫고 선택은 남긴다. 격자의 Esc(선택 해제)까지 가지 않게 먼저 받는다.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <BarButton onClick={() => setOpen((value) => !value)} label="옮기기" icon={<FolderIcon size={16} />} expanded={open} />
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="옮길 폴더"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease }}
            className="absolute bottom-full left-0 mb-2 w-44 origin-bottom-left rounded-md border border-[var(--line)] bg-[var(--raised)] p-1 shadow-[var(--shadow)]"
          >
            <MenuList
              role="menuitemradio"
              entries={folders.map((name) => ({
                key: name,
                label: name,
                checked: sharedFolder === name,
                disabled: sharedFolder === name,
                onSelect: () => {
                  setOpen(false);
                  onMove(name);
                },
              }))}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
