// 달마다 머리글로 묶고 행 높이를 맞춘 격자(r2), 오른쪽 연도 막대와 맨 위로 단추.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { formatDuration } from "../format";
import { justifyRows } from "../layout";
import { countByKind, kindSummary, thumbSrc, type Group, type MediaItem } from "../library";
import { ArrowUpIcon, CheckIcon, HeartIcon, VideoBadgeIcon } from "./Icons";
import { colorTagHex } from "./colorTags";

export interface SelectMods {
  toggle: boolean;
  range: boolean;
}

interface GridProps {
  groups: Group[];
  rowHeight: number;
  selected: Set<string>;
  focusId: string | null;
  empty: ReactNode;
  onSelect: (id: string, mods: SelectMods) => void;
  onClearSelection: () => void;
  onOpen: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}

const gap = 4;

export function Grid({ groups, rowHeight, selected, focusId, empty, onSelect, onClearSelection, onOpen, onContextMenu }: GridProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrolledYear, setScrolledYear] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    // ResizeObserver의 첫 알림을 기다리지 않고 첫 화면부터 격자를 그린다.
    const style = getComputedStyle(element);
    setWidth(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 키보드로 옮긴 초점이 화면 밖이면 보이도록 스크롤한다.
  useEffect(() => {
    if (!focusId) return;
    scroller.current?.querySelector<HTMLElement>(`[data-item="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  const years = [...new Set(groups.map((group) => group.year).filter((year): year is string => year !== null))];
  const currentYear = scrolledYear && years.includes(scrolledYear) ? scrolledYear : years[0];

  // 화면 맨 위를 지난 마지막 달 묶음의 연도를 지금 연도로 본다.
  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    setShowTop(element.scrollTop > 600);
    const top = element.getBoundingClientRect().top;
    let found: string | null = null;
    for (const section of element.querySelectorAll<HTMLElement>("[data-group-year]")) {
      if (section.getBoundingClientRect().top - top <= 8) found = section.dataset.groupYear ?? found;
    }
    setScrolledYear(found);
  };

  const jumpToYear = (year: string) => {
    const element = scroller.current;
    const section = element?.querySelector<HTMLElement>(`[data-group-year="${year}"]`);
    if (!element || !section) return;
    const delta = section.getBoundingClientRect().top - element.getBoundingClientRect().top;
    element.scrollTo({ top: element.scrollTop + delta - 4, behavior: "smooth" });
  };

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  // 좁은 화면에서는 연도 막대를 빼고 격자에 너비를 모두 준다.
  const showRail = years.length > 1 && total > 0 && width >= 560;
  const contentWidth = Math.max(0, width - (showRail ? 44 : 0));
  // 휴대폰 너비에서 한 줄에 한 장만 남지 않도록 목표 높이를 너비에 맞춰 낮춘다.
  const effectiveRowHeight = Math.min(rowHeight, Math.max(96, contentWidth / 2.6));

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClearSelection();
        }}
        className="h-full overflow-y-auto px-3 pt-2 pb-16 thin-scroll sm:px-5"
      >
        {total === 0 ? (
          <div className="grid h-full place-items-center">{empty}</div>
        ) : (
          groups.map((group) => (
            <section key={group.key} data-group-year={group.year ?? undefined} className="pb-4" style={{ width: contentWidth || undefined }}>
              {group.label && <GroupHeader group={group} />}
              <GroupRows
                items={group.items}
                width={contentWidth}
                rowHeight={effectiveRowHeight}
                selected={selected}
                focusId={focusId}
                onSelect={onSelect}
                onOpen={onOpen}
                onContextMenu={onContextMenu}
              />
            </section>
          ))
        )}
      </div>

      {showRail && (
        <nav aria-label="연도로 이동" className="absolute top-3 right-2 bottom-3 flex w-10 flex-col items-end gap-0.5">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => jumpToYear(year)}
              aria-current={year === currentYear ? "true" : undefined}
              className={`flex h-6 items-center gap-1 rounded px-1 text-[13px] tabular-nums ${
                year === currentYear ? "font-[650] text-[var(--ink)]" : "text-[var(--faint)] hover:text-[var(--ink)]"
              }`}
            >
              {year === currentYear && <span className="h-0.5 w-2 rounded-full bg-[var(--accent)]" />}
              {year}
            </button>
          ))}
        </nav>
      )}

      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            aria-label="맨 위로"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="absolute right-5 bottom-5 grid size-9 place-items-center rounded-full border border-[var(--line)] bg-[var(--raised)] text-[var(--ink)] shadow-[var(--shadow)]"
          >
            <ArrowUpIcon size={17} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupHeader({ group }: { group: Group }) {
  return (
    <h2 className="sticky top-0 z-10 -mx-1 flex items-baseline gap-2 bg-[var(--surface)]/92 px-1 py-2 backdrop-blur">
      <span className="text-[16px] font-[650] text-[var(--ink)]">{group.label}</span>
      <span className="text-[13px] text-[var(--faint)]">{kindSummary(countByKind(group.items))}</span>
    </h2>
  );
}

interface RowsProps {
  items: MediaItem[];
  width: number;
  rowHeight: number;
  selected: Set<string>;
  focusId: string | null;
  onSelect: GridProps["onSelect"];
  onOpen: GridProps["onOpen"];
  onContextMenu: GridProps["onContextMenu"];
}

function GroupRows({ items, width, rowHeight, selected, focusId, onSelect, onOpen, onContextMenu }: RowsProps) {
  const rows = justifyRows(items, width, rowHeight, gap);
  return (
    <div className="flex flex-col" style={{ gap }}>
      {rows.map((row) => (
        <div key={row.cells[0].item.id} className="flex" style={{ gap, height: row.height }}>
          {row.cells.map(({ item, width: cellWidth }) => (
            <Tile
              key={item.id}
              item={item}
              width={cellWidth}
              height={row.height}
              selected={selected.has(item.id)}
              focused={focusId === item.id}
              selecting={selected.size > 1}
              onSelect={onSelect}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface TileProps {
  item: MediaItem;
  width: number;
  height: number;
  selected: boolean;
  focused: boolean;
  // 두 개 이상 고른 동안은 모든 칸에 선택 동그라미를 띄운다.
  selecting: boolean;
  onSelect: GridProps["onSelect"];
  onOpen: GridProps["onOpen"];
  onContextMenu: GridProps["onContextMenu"];
}

function Tile({ item, width, height, selected, focused, selecting, onSelect, onOpen, onContextMenu }: TileProps) {
  const mods = (event: MouseEvent) => ({ toggle: event.ctrlKey || event.metaKey, range: event.shiftKey });
  return (
    <div
      data-item={item.id}
      role="option"
      aria-selected={selected}
      aria-label={item.name}
      onClick={(event) => {
        // 마우스가 없는 터치 화면에서는 한 번 눌러 크게 보고, 고르기는 동그라미로 한다.
        const touchOnly = window.matchMedia("(hover: none)").matches;
        if (touchOnly && !selecting && !event.ctrlKey && !event.metaKey && !event.shiftKey) onOpen(item.id);
        else onSelect(item.id, mods(event));
      }}
      onDoubleClick={() => onOpen(item.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(item.id, event.clientX, event.clientY);
      }}
      className={`group relative shrink-0 overflow-hidden rounded-[3px] bg-[var(--hover)] ${focused ? "z-[1]" : ""}`}
      style={{ width, height }}
    >
      <img
        src={thumbSrc(item)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`size-full object-cover transition-transform duration-200 ${selected ? "scale-[0.94] rounded-[3px]" : ""}`}
      />
      {selected && <span className="pointer-events-none absolute inset-0 rounded-[3px] ring-[3px] ring-[var(--accent)] ring-inset" />}
      {focused && !selected && <span className="pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-[var(--ink)]/60 ring-inset" />}

      <motion.button
        type="button"
        whileTap={{ scale: 0.86 }}
        transition={{ duration: 0.16 }}
        aria-label={selected ? `${item.name} 선택 해제` : `${item.name} 선택`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(item.id, { toggle: true, range: event.shiftKey });
        }}
        className={`absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full border transition-opacity ${
          selected
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)] opacity-100"
            : `border-white/90 bg-black/25 text-transparent ${selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`
        }`}
      >
        <CheckIcon size={13} strokeWidth={2.6} />
      </motion.button>

      {/* 동영상 길이와 GIF 표시는 같은 형식 표시라 왼쪽 아래 한 자리에 같은 모양으로 둔다.
          전에는 GIF만 오른쪽 위에 더 진한 면과 넓은 자간으로 따로 붙어 있었다. */}
      <div className="pointer-events-none absolute right-1.5 bottom-1.5 left-1.5 flex items-center gap-1.5 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
        {item.kind === "video" && (
          <span className="flex items-center gap-1 rounded bg-black/45 px-1.5 py-px text-[13px] tabular-nums">
            <VideoBadgeIcon size={13} />
            {formatDuration(item.duration ?? 0)}
          </span>
        )}
        {item.kind === "gif" && <span className="rounded bg-black/45 px-1.5 py-px text-[13px]">GIF</span>}
        <span className="ml-auto flex items-center gap-1">
          {item.colorTag && <span className="size-2.5 rounded-full ring-1 ring-white/80" style={{ background: colorTagHex[item.colorTag] }} />}
          {item.favorite && <HeartIcon size={14} filled />}
        </span>
      </div>
    </div>
  );
}
