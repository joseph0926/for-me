// 오른쪽 클릭 메뉴(r5): 열기, 정렬 하위 메뉴, 즐겨찾기, 색 태그, 별점, 폴더로 이동, 휴지통.
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { colorTags, folders, sortKeys, sortLabels, type ColorTag, type MediaItem, type SortKey } from "../library";
import { colorTagHex, colorTagLabels } from "./colorTags";
import { ChevronRight, StarIcon } from "./Icons";
import { MenuList } from "./MenuList";

export interface MenuState {
  x: number;
  y: number;
  ids: string[];
}

interface ContextMenuProps {
  menu: MenuState;
  targets: MediaItem[];
  sort: SortKey;
  onClose: () => void;
  onOpen: () => void;
  onSort: (key: SortKey) => void;
  onFavorite: () => void;
  onColorTag: (tag: ColorTag | null) => void;
  onRating: (rating: number) => void;
  onMove: (folder: string) => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}

const menuWidth = 224;
const submenuWidth = 180;
// 영구 삭제는 같은 자리를 3초 안에 한 번 더 눌러야 실행한다(tastepin 삭제 확인).
const confirmWindowMs = 3000;

export function ContextMenu(props: ContextMenuProps) {
  const { menu, targets, onClose } = props;
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: menu.x, top: menu.y });
  const [submenu, setSubmenu] = useState<"sort" | "move" | null>(null);
  const [armed, setArmed] = useState(false);

  // 화면 오른쪽이나 아래에 닿으면 메뉴를 커서 반대쪽으로 붙인다.
  useLayoutEffect(() => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: menu.x + rect.width > window.innerWidth - 8 ? Math.max(8, menu.x - rect.width) : menu.x,
      top: menu.y + rect.height > window.innerHeight - 8 ? Math.max(8, window.innerHeight - rect.height - 8) : menu.y,
    });
  }, [menu.x, menu.y]);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), confirmWindowMs);
    return () => window.clearTimeout(timer);
  }, [armed]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    const onBlur = () => onClose();
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onBlur);
    };
  }, [onClose]);

  const run = (action: () => void) => () => {
    action();
    onClose();
  };
  const inTrash = targets.every((item) => item.trashed);
  const allFavorite = targets.every((item) => item.favorite);
  const sharedRating = targets.every((item) => item.rating === targets[0].rating) ? targets[0].rating : -1;
  const sharedColor = targets.every((item) => item.colorTag === targets[0].colorTag) ? targets[0].colorTag : undefined;
  const opensRight = position.left + menuWidth + submenuWidth < window.innerWidth;

  return (
    <motion.div
      ref={root}
      role="menu"
      aria-label={targets.length > 1 ? `${targets.length}개 항목 메뉴` : `${targets[0].name} 메뉴`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.14, ease: [0.215, 0.61, 0.355, 1] }}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-50 origin-top-left rounded-md border border-[var(--line)] bg-[var(--raised)] p-1 shadow-[var(--shadow)]"
      style={{ ...position, width: menuWidth }}
    >
      {inTrash ? (
        <MenuList
          entries={[
            { key: "restore", label: "복원", onSelect: run(props.onRestore) },
            {
              key: "delete",
              danger: true,
              label: armed ? "정말 삭제" : "영구 삭제",
              onSelect: armed ? run(props.onDeleteForever) : () => setArmed(true),
            },
          ]}
        />
      ) : (
        <>
          <div onPointerEnter={() => setSubmenu(null)}>
            <MenuList
              entries={[
                { key: "open", label: targets.length > 1 ? "첫 항목 크게 보기" : "크게 보기", hint: "Enter", onSelect: run(props.onOpen) },
              ]}
            />
          </div>
          <Sub label="정렬 기준" open={submenu === "sort"} onOpen={() => setSubmenu("sort")} right={opensRight}>
            <MenuList
              role="menuitemradio"
              entries={sortKeys.map((key) => ({ key, label: sortLabels[key], checked: props.sort === key, onSelect: run(() => props.onSort(key)) }))}
            />
          </Sub>
          <Divider />
          <div onPointerEnter={() => setSubmenu(null)}>
            <MenuList
              entries={[{ key: "favorite", label: allFavorite ? "즐겨찾기 빼기" : "즐겨찾기", hint: "F", onSelect: run(props.onFavorite) }]}
            />
            <div className="px-2.5 pt-1.5 pb-1">
              <p className="pb-1.5 text-[13px] text-[var(--faint)]">색 태그</p>
              <div className="flex gap-2">
                {colorTags.map((tag) => (
                  <motion.button
                    key={tag}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sharedColor === tag}
                    aria-label={`${colorTagLabels[tag]} 색 태그`}
                    whileTap={{ scale: 0.95 }}
                    onClick={run(() => props.onColorTag(sharedColor === tag ? null : tag))}
                    className={`size-[18px] rounded-full ${sharedColor === tag ? "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--raised)]" : ""}`}
                    style={{ background: colorTagHex[tag] }}
                  />
                ))}
              </div>
            </div>
            <div className="px-2.5 pt-1 pb-1.5">
              <p className="pb-1 text-[13px] text-[var(--faint)]">별점</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sharedRating === star}
                    aria-label={`별 ${star}개`}
                    onClick={run(() => props.onRating(sharedRating === star ? 0 : star))}
                    className={`grid size-6 place-items-center ${star <= sharedRating ? "text-[#d99a26]" : "text-[var(--faint)] hover:text-[#d99a26]"}`}
                  >
                    <StarIcon size={16} filled={star <= sharedRating} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Divider />
          <Sub label="폴더로 이동" open={submenu === "move"} onOpen={() => setSubmenu("move")} right={opensRight}>
            <MenuList
              role="menuitemradio"
              entries={folders.map((name) => {
                const here = targets.every((item) => item.folder === name);
                return { key: name, label: name, checked: here, disabled: here, onSelect: run(() => props.onMove(name)) };
              })}
            />
          </Sub>
          <div onPointerEnter={() => setSubmenu(null)}>
            <MenuList entries={[{ key: "trash", label: "휴지통으로 이동", hint: "Del", onSelect: run(props.onTrash) }]} />
          </div>
        </>
      )}
    </motion.div>
  );
}

function Sub({ label, open, onOpen, right, children }: { label: string; open: boolean; onOpen: () => void; right: boolean; children: ReactNode }) {
  return (
    <div className="relative" onPointerEnter={onOpen}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onOpen}
        className={`flex h-[30px] w-full items-center rounded-[4px] px-2.5 text-left text-[14px] ${open ? "bg-[var(--hover)]" : ""}`}
      >
        {label}
        <ChevronRight size={14} className="ml-auto" />
      </button>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.14, ease: [0.215, 0.61, 0.355, 1] }}
          className={`absolute -top-1 rounded-md border border-[var(--line)] bg-[var(--raised)] p-1 shadow-[var(--shadow)] ${
            right ? "left-full ml-1 origin-top-left" : "right-full mr-1 origin-top-right"
          }`}
          style={{ width: submenuWidth }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="mx-1 my-1 h-px bg-[var(--line)]" />;
}
