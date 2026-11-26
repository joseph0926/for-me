// 크게 보기(r2): 위쪽 파일 이름과 동작, 이미지 확대와 끌어 옮기기, 아래 필름 띠와 크기, 배율 막대.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";

import { formatBytes } from "../format";
import { thumbSrc, type MediaItem } from "../library";
import { ChevronLeft, FilmIcon, FitIcon, HeartIcon, InfoIcon, TrashIcon, ZoomInIcon, ZoomOutIcon } from "./Icons";
import { VideoPlayer } from "./VideoPlayer";

interface ViewerProps {
  items: MediaItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onTrash: (id: string) => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
}

// 배율은 원본 픽셀 기준이다. "fit"은 화면에 다 들어가는 배율이며 원본보다 키우지는 않는다.
type Zoom = "fit" | number;
const zoomSteps = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const maxZoom = 4;
const stagePadding = 32;
// tastepin 사진 갤러리 크게 보기 값: 마우스를 2초 움직이지 않으면 막대와 필름 띠를 160ms에 흐리게 숨기고 커서도 숨긴다.
const idleMs = 2000;
const chromeFade = { duration: 0.16, ease: "easeOut" } as const;

export function Viewer({ items, index, onIndex, onClose, onFavorite, onTrash, infoOpen, onToggleInfo }: ViewerProps) {
  const item = items[index];
  const [filmstrip, setFilmstrip] = useState(true);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [box, setBox] = useState({ width: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  // 막대 위에 마우스가 있거나 키보드 초점이 막대 안에 있으면 숨기지 않는다. 누르려는 단추가 사라지지 않게 한다.
  const holding = useRef(false);

  const wake = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    // 마우스가 없는 터치 화면에서는 숨기지 않는다. 보이지 않는 단추를 눌러 버리게 된다.
    if (!window.matchMedia("(hover: hover)").matches) return;
    idleTimer.current = window.setTimeout(() => {
      if (!holding.current) setIdle(true);
    }, idleMs);
  };
  const hold = (on: boolean) => {
    holding.current = on;
    wake();
  };
  // 열 때와 사진을 넘길 때 다시 보이고 시계를 새로 건다.
  useEffect(() => {
    wake();
    return () => window.clearTimeout(idleTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  const chromeProps = {
    animate: { opacity: idle ? 0 : 1 },
    transition: chromeFade,
    onPointerEnter: () => hold(true),
    onPointerLeave: () => hold(false),
    // 마우스로 누른 단추에 남은 초점은 세지 않는다. 그러면 필름 띠를 한 번 누른 뒤로 막대가 숨지 않는다.
    onFocusCapture: (event: FocusEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).matches(":focus-visible")) hold(true);
    },
    onBlurCapture: () => {
      if (holding.current) hold(false);
    },
  };

  const fitScale = box.width > 0 ? Math.min(1, (box.width - stagePadding) / item.width, (box.height - stagePadding) / item.height) : 1;
  const scale = zoom === "fit" ? fitScale : zoom;
  const minZoom = Math.min(fitScale, 0.25);
  const setScale = (next: number) => {
    const bounded = Math.max(minZoom, Math.min(maxZoom, next));
    setZoom(Math.abs(bounded - fitScale) < 0.001 ? "fit" : bounded);
  };
  const stepZoom = (direction: 1 | -1) => {
    // 맞춤 배율 바로 옆 단계(예: 72%에서 75%)로 가면 눈에 띄지 않으므로 10% 넘게 달라지는 단계로 간다.
    const next =
      direction > 0
        ? zoomSteps.find((step) => step > scale * 1.1)
        : [...zoomSteps].reverse().find((step) => step < scale / 1.1);
    setScale(next ?? (direction > 0 ? maxZoom : minZoom));
  };
  const go = (next: number) => {
    setZoom("fit");
    onIndex(next);
  };

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index, filmstrip]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select")) return;
      const isImage = item.kind !== "video";
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && hasPrev) go(index - 1);
      else if (event.key === "ArrowRight" && hasNext) go(index + 1);
      else if (event.key === "f" || event.key === "F") onFavorite(item.id);
      else if (event.key === "Delete") onTrash(item.id);
      else if (event.key === "i" || event.key === "I") onToggleInfo();
      else if (isImage && (event.key === "+" || event.key === "=")) stepZoom(1);
      else if (isImage && event.key === "-") stepZoom(-1);
      else if (isImage && event.key === "0") setZoom("fit");
      else if (isImage && event.key === "1") setScale(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const percent = Math.round(scale * 100);
  const sliderFill = ((scale - 0.25) / (maxZoom - 0.25)) * 100;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} 크게 보기`}
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
      onPointerMove={wake}
      onKeyDownCapture={wake}
      className={`on-dark flex size-full flex-col bg-[var(--viewer)] text-white ${idle ? "cursor-none" : ""}`}
    >
      <motion.header {...chromeProps} className="flex h-11 shrink-0 items-center gap-1 px-2">
        <button type="button" onClick={onClose} aria-label="목록으로" className="flex h-8 items-center gap-1 rounded-md px-2 text-white/85 hover:bg-white/10">
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">목록</span>
        </button>
        {/* 몇 번째인지는 아래 필름 띠가 보여 주므로 "2 / 44" 같은 숫자는 두지 않는다. */}
        <p className="min-w-0 flex-1 truncate text-center text-[13px] text-white/90">{item.name}</p>
        <button
          type="button"
          aria-label="즐겨찾기"
          aria-pressed={item.favorite}
          onClick={() => onFavorite(item.id)}
          className={`grid size-8 place-items-center rounded-md hover:bg-white/10 ${item.favorite ? "text-[#ff6b70]" : "text-white/85"}`}
        >
          <HeartIcon size={18} filled={item.favorite} />
        </button>
        <button type="button" aria-label="휴지통으로 이동" onClick={() => onTrash(item.id)} className="grid size-8 place-items-center rounded-md text-white/85 hover:bg-white/10">
          <TrashIcon size={18} />
        </button>
        <button
          type="button"
          aria-label="정보 패널"
          aria-pressed={infoOpen}
          onClick={onToggleInfo}
          className={`grid size-8 place-items-center rounded-md hover:bg-white/10 ${infoOpen ? "bg-white/15 text-white" : "text-white/85"}`}
        >
          <InfoIcon size={18} />
        </button>
        {/* 닫기는 왼쪽 "목록" 하나로 한다. 오른쪽 끝에 같은 일을 하는 X가 따로 있었다. */}
      </motion.header>

      <div ref={stage} className="relative min-h-0 flex-1">
        {item.kind === "video" ? (
          <VideoPlayer key={item.id} item={item} />
        ) : (
          <ImageStage key={item.id} item={item} scale={scale} box={box} onToggleZoom={() => (zoom === "fit" ? setScale(1) : setZoom("fit"))} onWheelZoom={stepZoom} />
        )}
        {/* 앞뒤 이동은 아래 필름 띠와 ←, →가 맡는다(tastepin 크게 보기: 아래 필름 띠). 사진 양옆에 떠 있던 둥근 화살표는 뺐다. */}
      </div>

      {/* 필름 띠는 높이 56px에 44px 정사각 썸네일을 늘어놓고 지금 항목을 흰 테두리로 표시한다(tastepin 크게 보기 값). */}
      <AnimatePresence initial={false}>
        {filmstrip && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 56 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
            className="shrink-0 overflow-hidden"
          >
          <motion.div
            ref={strip}
            {...chromeProps}
            className="flex h-14 items-center gap-1 overflow-x-auto px-3 thin-scroll"
            aria-label="필름 띠"
          >
            {items.map((other, i) => (
              <button
                key={other.id}
                type="button"
                aria-label={other.name}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className={`relative size-11 shrink-0 overflow-hidden rounded-[3px] transition-opacity ${
                  i === index ? "opacity-100 outline-2 -outline-offset-2 outline-white" : "opacity-55 hover:opacity-90"
                }`}
              >
                <img src={thumbSrc(other)} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer {...chromeProps} className="flex h-11 shrink-0 items-center gap-1 px-2 text-[13px] text-white/70">
        <button
          type="button"
          aria-label="필름 띠"
          aria-pressed={filmstrip}
          onClick={() => setFilmstrip((v) => !v)}
          className={`grid size-8 place-items-center rounded-md hover:bg-white/10 ${filmstrip ? "text-white" : ""}`}
        >
          <FilmIcon size={18} />
        </button>
        <span className="ml-1 hidden tabular-nums sm:inline">
          {item.width} x {item.height}px
        </span>
        {/* 형식은 위 막대의 파일 이름 확장자가 이미 보여 주어 고정폭 글자 칩을 따로 두지 않는다. */}
        <span className="ml-3 hidden tabular-nums sm:inline">{formatBytes(item.bytes)}</span>

        {item.kind !== "video" && (
          <div className="ml-auto flex items-center">
            <button
              type="button"
              aria-label="화면에 맞추기"
              aria-pressed={zoom === "fit"}
              onClick={() => setZoom("fit")}
              className={`grid size-8 place-items-center rounded-md hover:bg-white/10 ${zoom === "fit" ? "text-white" : ""}`}
            >
              <FitIcon size={18} />
            </button>
            <select
              aria-label="배율"
              value={zoom === "fit" ? "fit" : String(zoom)}
              onChange={(event) => (event.target.value === "fit" ? setZoom("fit") : setScale(Number(event.target.value)))}
              className="mx-1 h-7 rounded-md border border-white/15 bg-[#1d1e21] px-1.5 text-[13px] text-white tabular-nums"
            >
              <option value="fit">맞춤 {Math.round(fitScale * 100)}%</option>
              {zoom !== "fit" && !zoomSteps.includes(zoom) && <option value={String(zoom)}>{percent}%</option>}
              {zoomSteps.map((step) => (
                <option key={step} value={String(step)}>
                  {step * 100}%
                </option>
              ))}
            </select>
            <button type="button" aria-label="축소" onClick={() => stepZoom(-1)} className="grid size-8 place-items-center rounded-md hover:bg-white/10">
              <ZoomOutIcon size={17} />
            </button>
            <input
              type="range"
              aria-label="배율 막대"
              className="range hidden w-28 sm:block"
              min={0.25}
              max={maxZoom}
              step={0.05}
              value={scale}
              style={{ "--fill": `${sliderFill}%` } as CSSProperties}
              onChange={(event) => setScale(Number(event.target.value))}
            />
            <button type="button" aria-label="확대" onClick={() => stepZoom(1)} className="grid size-8 place-items-center rounded-md hover:bg-white/10">
              <ZoomInIcon size={17} />
            </button>
          </div>
        )}
      </motion.footer>
    </motion.div>
  );
}

interface StageProps {
  item: MediaItem;
  scale: number;
  box: { width: number; height: number };
  onToggleZoom: () => void;
  onWheelZoom: (direction: 1 | -1) => void;
}

// 이미지와 GIF를 배율대로 그리고, 화면보다 크면 끌어서 옮긴다.
function ImageStage({ item, scale, box, onToggleZoom, onWheelZoom }: StageProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const shownWidth = item.width * scale;
  const shownHeight = item.height * scale;
  // 화면보다 작으면 옮길 필요가 없으므로 옮긴 거리를 남는 폭 안으로 묶는다.
  const limitX = Math.max(0, (shownWidth - box.width) / 2);
  const limitY = Math.max(0, (shownHeight - box.height) / 2);
  const clamp = (x: number, y: number) => ({ x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) });
  const shown = clamp(offset.x, offset.y);
  const movable = limitX > 0 || limitY > 0;

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!movable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: shown.x, oy: shown.y };
    setDragging(true);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    const start = drag.current;
    if (start) setOffset(clamp(start.ox + event.clientX - start.x, start.oy + event.clientY - start.y));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div
      className={`grid size-full place-items-center overflow-hidden ${movable ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      onWheel={(event) => onWheelZoom(event.deltaY < 0 ? 1 : -1)}
      onDoubleClick={onToggleZoom}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img
        src={item.src}
        alt={item.name}
        draggable={false}
        className="max-w-none select-none"
        style={{ width: shownWidth, height: shownHeight, transform: `translate(${shown.x}px, ${shown.y}px)` }}
      />
    </div>
  );
}
