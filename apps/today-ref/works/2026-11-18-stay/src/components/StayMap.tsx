import { motion, useMotionValue } from "motion/react";
import { useRef, useState } from "react";

import { type MapPoint, type Stay, lowestPrice } from "../data";
import { useElementSize } from "../hooks";
import { type MarkerGroup, groupMarkers } from "../mapMarkers";
import { won } from "../pricing";
import { CityMapArt } from "./CityMapArt";
import { MinusIcon, PlusIcon } from "./icons";

const ZOOM_LEVELS = [1, 1.4, 1.9, 2.6, 3.4];
const DEFAULT_FOCUS: MapPoint = { x: 506, y: 492 };

// 숙소가 놓인 범위. 확대하지 않은 지도는 이 범위가 칸 안에 모두 들어오는 크기로 그린다.
const CONTENT_WIDTH = 0.84;
const CONTENT_HEIGHT = 0.66;
const DRAG_LIMIT_PX = 360;

interface MapView {
  zoomIndex: number;
  /** 칸 가운데에 오는 지도 좌표 */
  center: MapPoint;
}

/**
 * 지도 그림은 1000 x 1000 정사각형이고, 그리는 크기는 CSS 컨테이너 단위로 계산한다.
 * 마커 묶음은 같은 크기를 픽셀로 다시 계산해 겹침을 판단한다.
 */
export function StayMap({
  stays,
  activeId = null,
  onHover,
  onSelect,
  focus = DEFAULT_FOCUS,
  initialZoom = 0,
  variant = "price",
}: {
  stays: Stay[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  focus?: MapPoint;
  initialZoom?: number;
  variant?: "price" | "pin";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const container = useElementSize(containerRef);
  const [view, setView] = useState<MapView>({ zoomIndex: initialZoom, center: focus });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // 끌기로 끝난 포인터 동작은 마커 클릭으로 치지 않는다.
  const draggedRef = useRef(false);

  const zoom = ZOOM_LEVELS[view.zoomIndex];
  const size = `min(100cqw / ${CONTENT_WIDTH}, 100cqh / ${CONTENT_HEIGHT}) * ${zoom}`;
  const dragLimit = DRAG_LIMIT_PX * zoom;
  const pxPerUnitAt = (zoomIndex: number) =>
    (Math.min(container.width / CONTENT_WIDTH, container.height / CONTENT_HEIGHT) * ZOOM_LEVELS[zoomIndex]) / 1000;
  const measured = container.width > 0 && container.height > 0;
  const groups = variant === "price" && measured ? groupMarkers(stays, pxPerUnitAt(view.zoomIndex)) : [];

  // 끌어서 옮긴 만큼을 가운데 좌표에 반영하고 끌기 위치는 0으로 되돌린다.
  function moveTo(zoomIndex: number, center: MapPoint) {
    setView({ zoomIndex, center });
    x.set(0);
    y.set(0);
  }

  function visibleCenter(): MapPoint {
    const pxPerUnit = pxPerUnitAt(view.zoomIndex);
    if (pxPerUnit === 0) return view.center;
    return { x: view.center.x - x.get() / pxPerUnit, y: view.center.y - y.get() / pxPerUnit };
  }

  function changeZoom(step: number) {
    const zoomIndex = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, view.zoomIndex + step));
    moveTo(zoomIndex, visibleCenter());
  }

  // 묶음을 누르면 묶인 숙소가 모두 따로 보이는 가장 낮은 배율로 그 자리를 확대한다.
  function expandGroup(group: MarkerGroup) {
    let zoomIndex = view.zoomIndex + 1;
    while (
      zoomIndex < ZOOM_LEVELS.length - 1 &&
      groupMarkers(group.stays, pxPerUnitAt(zoomIndex)).length < group.stays.length
    ) {
      zoomIndex += 1;
    }
    moveTo(Math.min(zoomIndex, ZOOM_LEVELS.length - 1), group.pos);
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#f1efe9] [container-type:size]">
      <motion.div
        drag
        dragConstraints={{ left: -dragLimit, right: dragLimit, top: -dragLimit, bottom: dragLimit }}
        dragElastic={0.06}
        dragMomentum={false}
        onPointerDown={() => {
          draggedRef.current = false;
        }}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        style={{
          x,
          y,
          width: `calc(${size})`,
          height: `calc(${size})`,
          left: `calc(50cqw - ${size} * ${view.center.x / 1000})`,
          top: `calc(50cqh - ${size} * ${view.center.y / 1000})`,
        }}
        className="absolute cursor-grab touch-none transition-[left,top,width,height] duration-300 ease-out active:cursor-grabbing"
      >
        <CityMapArt />

        {variant === "pin" &&
          stays.map((stay) => (
            <span
              key={stay.id}
              style={{ left: `${stay.pos.x / 10}%`, top: `${stay.pos.y / 10}%` }}
              className="absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent/15"
            >
              <span className="h-4 w-4 rounded-full border-[3px] border-white bg-accent shadow-[0_1px_4px_rgb(0_0_0/0.3)]" />
            </span>
          ))}

        {groups.map((group) => {
          const active = activeId !== null && group.stays.some((stay) => stay.id === activeId);
          const single = group.stays.length === 1 ? group.stays[0] : null;

          return (
            <button
              key={group.key}
              type="button"
              style={{ left: `${group.pos.x / 10}%`, top: `${group.pos.y / 10}%` }}
              onMouseEnter={single ? () => onHover?.(single.id) : undefined}
              onMouseLeave={single ? () => onHover?.(null) : undefined}
              onClick={() => {
                if (draggedRef.current) return;
                if (single) onSelect?.(single.id);
                else expandGroup(group);
              }}
              aria-label={
                single ? `${single.name} ${won(lowestPrice(single))}` : `숙소 ${group.stays.length}곳 묶음, 눌러서 확대`
              }
              className={`
                tabular absolute flex h-7 -translate-x-1/2 -translate-y-1/2 items-center whitespace-nowrap rounded-full border px-2.5
                text-[13px] font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.18)] transition-[scale,background-color,color] duration-150
                ${active ? "z-20 scale-110 border-ink bg-ink text-white" : "z-10 bg-white text-ink hover:z-20 hover:scale-105"}
                ${!active && single ? "border-black/10" : ""}
                ${!active && !single ? "border-ink/45" : ""}
              `}
            >
              {group.label}
            </button>
          );
        })}
      </motion.div>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]">
        <button
          type="button"
          aria-label="지도 확대"
          onClick={() => changeZoom(1)}
          disabled={view.zoomIndex === ZOOM_LEVELS.length - 1}
          className="grid h-9 w-9 place-items-center text-ink hover:bg-canvas disabled:text-line-strong"
        >
          <PlusIcon size={18} />
        </button>
        <span className="h-px bg-line" />
        <button
          type="button"
          aria-label="지도 축소"
          onClick={() => changeZoom(-1)}
          disabled={view.zoomIndex === 0}
          className="grid h-9 w-9 place-items-center text-ink hover:bg-canvas disabled:text-line-strong"
        >
          <MinusIcon size={18} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-2 text-[11px] text-muted">
        <span className="flex flex-col items-start">
          <span>1km</span>
          <span className="h-1.5 w-12 border-x border-b border-muted" />
        </span>
      </div>
    </div>
  );
}
