// 격자 한 칸. 누르면 사진 보기를 열고, 선택 중이면 고르거나 풀고, 길게 누르면 선택을 시작한다.
import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";

import type { MediaItem } from "../data";
import { dayLabel, duration, timeLabel } from "../format";
import { quick } from "../motion";
import { useUi } from "../ui";
import { Icon } from "./Icon";

const longPressMs = 450;

export function Tile({
  item,
  scope,
  list,
  trash = false,
  className = "aspect-square",
  large = false,
  overlay,
}: {
  item: MediaItem;
  scope: string;
  // 사진 보기에서 좌우로 넘길 목록
  list: string[];
  trash?: boolean;
  className?: string;
  // 화면 폭 가득한 칸. 작은 정사각 미리보기 대신 원본을 쓴다.
  large?: boolean;
  overlay?: ReactNode;
}) {
  const ui = useUi();
  const selecting = ui.selection?.scope === scope;
  const selected = selecting && ui.selection!.ids.includes(item.id);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  function cancelPress() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function open(target: HTMLElement) {
    if (selecting) {
      ui.toggleSelected(item.id);
      return;
    }
    ui.openViewer({ ids: list, index: list.indexOf(item.id), from: target.getBoundingClientRect(), trash });
  }

  const label = `${item.kind === "video" ? "동영상" : "사진"}, ${dayLabel(item.takenAt)} ${timeLabel(item.takenAt)}`;

  return (
    <button
      type="button"
      data-tile-id={item.id}
      aria-label={label}
      aria-pressed={selecting ? selected : undefined}
      className={`relative block w-full overflow-hidden bg-sunken select-none ${className}`}
      onPointerDown={() => {
        longPressed.current = false;
        if (selecting) return;
        timer.current = window.setTimeout(() => {
          longPressed.current = true;
          ui.startSelection(scope, item.id);
        }, longPressMs);
      }}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        open(event.currentTarget);
      }}
    >
      <motion.img
        src={large && item.kind === "photo" ? item.src : item.thumb}
        alt=""
        draggable={false}
        loading="lazy"
        className="h-full w-full object-cover"
        animate={{ scale: selected ? 0.86 : 1 }}
        transition={quick}
      />
      {overlay}
      {item.kind === "video" && item.seconds !== undefined && (
        <span className="on-photo num absolute top-1.5 right-1.5 flex items-center gap-1 text-[11px] font-semibold">
          {duration(item.seconds)}
          <Icon name="play" size={11} />
        </span>
      )}
      {selecting && (
        <span
          className={`absolute top-1.5 left-1.5 grid size-[22px] place-items-center rounded-full border-[1.5px] ${
            selected ? "border-white bg-accent text-accent-ink" : "border-white bg-black/15"
          }`}
          style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.35)" }}
        >
          {selected && <Icon name="check" size={14} />}
        </span>
      )}
    </button>
  );
}
