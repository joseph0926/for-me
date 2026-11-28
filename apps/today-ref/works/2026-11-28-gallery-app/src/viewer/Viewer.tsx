// 사진 보기. 칸 자리에서 커지고, 좌우로 넘기고, 두 번 눌러 확대하고, 아래로 끌어 닫고, 위로 올려 정보를 본다(r5, r1).
import { animate, AnimatePresence, motion, useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

import { Icon } from "../components/Icon";
import { itemById, type MediaItem } from "../data";
import { dayLabel, duration } from "../format";
import { useGallery } from "../gallery";
// 정보는 아래에서 올라오는 시트라 다른 시트와 같은 곡선 300ms로 오르내린다(identity.motion, tastepin 드로어 값)
import { photoSpring, quick, settle, sheet as sheetMotion } from "../motion";
import { useUi, type ViewerRequest } from "../ui";
import { InfoPanel } from "./InfoPanel";

// motion의 animate 값으로 그대로 넘기므로 interface가 아닌 type으로 둔다(색인 서명 호환)
type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
};

interface Stage {
  left: number;
  top: number;
  width: number;
  height: number;
  // 폰 틀의 상태 표시줄과 제스처 막대 높이(--frame-top, --frame-bottom). 사진 보기는 그 뒤까지 넓혀 깔리므로
  // 정보를 열어 사진을 위 막대와 정보 사이에 넣을 때 이만큼 더 비켜야 막대 글자와 겹치지 않는다.
  insetTop: number;
  insetBottom: number;
}

const slideGap = 16;
const topBar = 52;
const bottomBar = 60;
const zoomLevel = 2.5;
const doubleTapMs = 280;

// 사진 비율을 지키며 영역 안에 가장 크게 넣은 상자
function fit(item: MediaItem, area: Box): Box {
  const scale = Math.min(area.width / item.width, area.height / item.height);
  const width = item.width * scale;
  const height = item.height * scale;
  return { left: area.left + (area.width - width) / 2, top: area.top + (area.height - height) / 2, width, height };
}

// 사진 보기를 연 칸이 지금 화면에 보이면 그 위치(사진 보기 기준)를 돌려준다. 닫을 때 그 칸으로 돌아간다.
function tileBox(id: string, stage: HTMLElement): Box | null {
  const stageRect = stage.getBoundingClientRect();
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tile-id="${id}"]`)) {
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.bottom > stageRect.top + 40 && rect.top < stageRect.bottom - 40;
    if (visible) return { left: rect.left - stageRect.left, top: rect.top - stageRect.top, width: rect.width, height: rect.height };
  }
  return null;
}

type Mode = "pending" | "page" | "dismiss" | "peek" | "pan" | "info";

export function Viewer({ request, onClosed }: { request: ViewerRequest; onClosed: () => void }) {
  const gallery = useGallery();
  const ui = useUi();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [currentId, setCurrentId] = useState(request.ids[request.index]);
  const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
  // 닫을 때 돌아갈 칸. 없으면 제자리에서 옅어진다.
  const [closeBox, setCloseBox] = useState<Box | null>(null);
  const [chrome, setChrome] = useState(true);
  const [info, setInfo] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [video, setVideo] = useState<{ id: string; playing: boolean; time: number }>({ id: "", playing: false, time: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);

  const pagerX = useMotionValue(0);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragScale = useMotionValue(1);
  const backdrop = useMotionValue(0);
  const zoom = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  const gesture = useRef<{ x: number; y: number; mode: Mode; panX: number; panY: number } | null>(null);
  // 끌어 닫는 동안에는 막대를 숨기고, 닫지 않고 제자리로 돌아오면 끌기 전 상태로 되돌린다
  const chromeBeforeDrag = useRef(true);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const tapTimer = useRef<number | null>(null);

  // 지금 넘길 수 있는 목록. 휴지통에서 열었으면 아직 휴지통에 있는 것, 아니면 보관함에 보이는 것만 남는다.
  const ids = request.ids.filter((id) => (request.trash ? gallery.trashed.includes(id) : gallery.isVisible(id)));
  // 보던 항목이 다른 곳(영구 삭제 시트)에서 사라지면 원래 목록에서 그다음 항목을 보여 준다
  const shownId = ids.includes(currentId)
    ? currentId
    : (request.ids.slice(request.ids.indexOf(currentId) + 1).find((id) => ids.includes(id)) ?? ids.at(-1) ?? currentId);
  const index = ids.indexOf(shownId);
  const item = itemById.get(shownId)!;
  const prevId = index > 0 ? ids[index - 1] : undefined;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : undefined;
  const playing = video.id === shownId && video.playing;

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      setStage({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        insetTop: parseFloat(styles.getPropertyValue("--frame-top")) || 0,
        insetBottom: parseFloat(styles.getPropertyValue("--frame-bottom")) || 0,
      });
    };
    measure();
    // 열리면서 검은 바탕이 칸에서 커지는 사진과 함께 짙어진다
    const fadeIn = animate(backdrop, 1, photoSpring);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      fadeIn.stop();
      observer.disconnect();
    };
  }, [backdrop]);

  // 넘긴 뒤 새 항목이 가운데 오면 넘기던 거리를 0으로 되돌린다. 같은 화면 갱신 안에서 해야 한 번 튀지 않는다.
  useLayoutEffect(() => {
    pagerX.set(0);
  }, [shownId, pagerX]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase !== "open") return;
      if (event.key === "Escape") {
        if (info) setInfo(false);
        else close();
      } else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => {
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
  }, []);

  const infoHeight = stage ? Math.round(stage.height * 0.46) : 0;

  function area(): Box {
    if (!stage) return { left: 0, top: 0, width: 0, height: 0 };
    if (!info) return { left: 0, top: 0, width: stage.width, height: stage.height };
    const top = stage.insetTop + topBar + 8;
    const bottom = stage.insetBottom + bottomBar + infoHeight + 12;
    return { left: 12, top, width: stage.width - 24, height: stage.height - bottom - top };
  }

  function resetZoom() {
    zoom.set(1);
    panX.set(0);
    panY.set(0);
    setZoomed(false);
  }

  function go(direction: 1 | -1) {
    const target = direction === 1 ? nextId : prevId;
    if (!target || !stage) return;
    resetZoom();
    videoRef.current?.pause();
    animate(pagerX, -direction * (stage.width + slideGap), { duration: 0.22, ease: settle }).then(() => setCurrentId(target));
  }

  function close() {
    if (phase === "closing" || !stageRef.current) return;
    videoRef.current?.pause();
    setCloseBox(info ? null : tileBox(shownId, stageRef.current));
    setInfo(false);
    setPhase("closing");
    animate(dragX, 0, photoSpring);
    animate(dragY, 0, photoSpring);
    animate(dragScale, 1, photoSpring);
    animate(zoom, 1, photoSpring);
    animate(panX, 0, photoSpring);
    animate(panY, 0, photoSpring);
    animate(backdrop, 0, photoSpring).then(onClosed);
  }

  function toggleZoom(clientX: number, clientY: number) {
    if (!stage || item.kind !== "photo") return;
    if (zoomed) {
      animate(zoom, 1, photoSpring);
      animate(panX, 0, photoSpring);
      animate(panY, 0, photoSpring);
      setZoomed(false);
      return;
    }
    const box = fit(item, area());
    const x = clientX - stage.left - (box.left + box.width / 2);
    const y = clientY - stage.top - (box.top + box.height / 2);
    const limits = panLimits(box, zoomLevel);
    animate(zoom, zoomLevel, photoSpring);
    animate(panX, clamp(-x * (zoomLevel - 1), limits.x), photoSpring);
    animate(panY, clamp(-y * (zoomLevel - 1), limits.y), photoSpring);
    setZoomed(true);
  }

  function panLimits(box: Box, scale: number) {
    const height = stage?.height ?? 0;
    return { x: (box.width * (scale - 1)) / 2, y: Math.max(0, (box.height * scale - height) / 2) };
  }

  function onTap(event: ReactPointerEvent) {
    const now = performance.now();
    const previous = lastTap.current;
    if (previous && now - previous.time < doubleTapMs && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 30) {
      if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
      lastTap.current = null;
      toggleZoom(event.clientX, event.clientY);
      return;
    }
    lastTap.current = { time: now, x: event.clientX, y: event.clientY };
    tapTimer.current = window.setTimeout(() => {
      if (info) setInfo(false);
      else setChrome((visible) => !visible);
    }, doubleTapMs);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (phase !== "open" || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { x: event.clientX, y: event.clientY, mode: "pending", panX: panX.get(), panY: panY.get() };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || !stage) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.mode === "pending") {
      if (Math.hypot(dx, dy) < 8) return;
      if (zoomed) g.mode = "pan";
      else if (info) g.mode = "info";
      else if (Math.abs(dx) > Math.abs(dy)) g.mode = "page";
      else g.mode = dy > 0 ? "dismiss" : "peek";
      if (g.mode === "dismiss") {
        chromeBeforeDrag.current = chrome;
        setChrome(false);
      }
    }
    if (g.mode === "page") {
      const blocked = (dx > 0 && !prevId) || (dx < 0 && !nextId);
      pagerX.set(blocked ? dx * 0.3 : dx);
    } else if (g.mode === "dismiss") {
      const progress = Math.min(Math.max(dy, 0) / (stage.height * 0.6), 1);
      dragX.set(dx);
      dragY.set(dy);
      dragScale.set(1 - progress * 0.35);
      backdrop.set(1 - progress * 0.85);
    } else if (g.mode === "peek") {
      dragY.set(Math.min(dy, 0) * 0.5);
    } else if (g.mode === "pan") {
      const limits = panLimits(fit(item, area()), zoom.get());
      panX.set(clamp(g.panX + dx, limits.x));
      panY.set(clamp(g.panY + dy, limits.y));
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !stage) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.mode === "pending") {
      onTap(event);
    } else if (g.mode === "page") {
      const velocity = pagerX.getVelocity();
      const wantsNext = (dx < -stage.width * 0.22 || velocity < -500) && nextId;
      const wantsPrev = (dx > stage.width * 0.22 || velocity > 500) && prevId;
      if (wantsNext) go(1);
      else if (wantsPrev) go(-1);
      else animate(pagerX, 0, photoSpring);
    } else if (g.mode === "dismiss") {
      if (dy > 110 || dragY.getVelocity() > 700) close();
      else {
        animate(dragX, 0, photoSpring);
        animate(dragY, 0, photoSpring);
        animate(dragScale, 1, photoSpring);
        animate(backdrop, 1, photoSpring);
        setChrome(chromeBeforeDrag.current);
      }
    } else if (g.mode === "peek") {
      if (dy < -50) setInfo(true);
      animate(dragY, 0, photoSpring);
    } else if (g.mode === "info") {
      if (dy > 50) setInfo(false);
    }
  }

  function toggleFavorite() {
    const on = !gallery.isFavorite(shownId);
    gallery.dispatch({ type: "favorite", ids: [shownId], on });
  }

  // 휴지통으로 옮기거나 복구하면 다음 항목으로 넘어가고, 남은 것이 없으면 닫는다
  function removeCurrent(action: "trash" | "restore") {
    const neighbor = nextId ?? prevId;
    resetZoom();
    if (neighbor) setCurrentId(neighbor);
    else close();
    gallery.dispatch({ type: action, ids: [shownId] });
    ui.showToast(
      action === "trash" ? "휴지통으로 옮겼습니다" : "보관함으로 복구했습니다",
      action === "trash" ? { type: "restore", ids: [shownId] } : { type: "trash", ids: [shownId] },
    );
  }

  const fromBox: Box | null =
    request.from && stage
      ? { left: request.from.left - stage.left, top: request.from.top - stage.top, width: request.from.width, height: request.from.height }
      : null;
  const openedId = request.ids[request.index];
  const favorite = gallery.isFavorite(shownId);
  const barsVisible = chrome && phase === "open";

  const slides = [
    { id: prevId, offset: -1 },
    { id: shownId, offset: 0 },
    { id: nextId, offset: 1 },
  ].filter((slide): slide is { id: string; offset: number } => slide.id !== undefined);

  return (
    <div
      data-frame-tone="dark"
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      className="absolute inset-x-0 z-30 overflow-hidden"
      style={{ top: "calc(-1 * var(--frame-top, 0px))", bottom: "calc(-1 * var(--frame-bottom, 0px))" }}
    >
      <motion.div className="absolute inset-0 bg-stage" style={{ opacity: backdrop }} />
      <div
        ref={stageRef}
        className="absolute inset-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {stage &&
          slides.map((slide) => {
            const slideItem = itemById.get(slide.id)!;
            const current = slide.offset === 0;
            const target = fit(slideItem, area());
            let animateTo: Box & { opacity: number; scale: number } = { ...target, opacity: 1, scale: 1 };
            if (current && phase === "closing") {
              animateTo = closeBox ? { ...closeBox, opacity: 1, scale: 1 } : { ...target, opacity: 0, scale: 0.92 };
            }
            const opening = current && phase === "opening" && slide.id === openedId;
            return (
              <motion.div
                key={slide.id}
                className="absolute inset-y-0"
                style={{ x: pagerX, left: slide.offset * (stage.width + slideGap), width: stage.width }}
              >
                <motion.div className="absolute inset-0" style={current ? { x: dragX, y: dragY, scale: dragScale } : undefined}>
                  <PhotoBox
                    item={slideItem}
                    current={current}
                    from={opening ? (fromBox ? { ...fromBox, opacity: 1, scale: 1 } : { ...target, opacity: 0, scale: 0.96 }) : null}
                    to={animateTo}
                    clip={phase !== "open"}
                    transforms={current ? { zoom, panX, panY } : null}
                    videoRef={current ? videoRef : null}
                    onVideo={(patch) => setVideo((state) => ({ ...(state.id === slide.id ? state : { id: slide.id, playing: false, time: 0 }), ...patch }))}
                    onOpened={opening ? () => setPhase("open") : undefined}
                  />
                </motion.div>
              </motion.div>
            );
          })}
      </div>

      <AnimatePresence>
        {barsVisible && (
          <motion.div
            key="top"
            className="absolute inset-x-0 top-0 z-10 flex items-center bg-gradient-to-b from-black/60 to-black/0 px-2 text-white"
            style={{ paddingTop: "var(--frame-top, 0px)", height: `calc(${topBar}px + var(--frame-top, 0px))` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={quick}
          >
            <button type="button" aria-label="닫기" className="grid size-11 place-items-center" onClick={close}>
              <Icon name="back" />
            </button>
            {/* 위 막대는 뒤로 단추와 날짜만 둔다(r5). 시각과 장소는 정보에서 본다. */}
            <p className="min-w-0 flex-1 pr-11 text-center text-[15px] font-bold">{dayLabel(item.takenAt)}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {item.kind === "video" && barsVisible && !info && (
        <VideoControls
          seconds={item.seconds ?? 0}
          time={video.id === shownId ? video.time : 0}
          playing={playing}
          onToggle={() => {
            const element = videoRef.current;
            if (!element) return;
            if (element.paused) {
              if (element.ended) element.currentTime = 0;
              void element.play();
            } else element.pause();
          }}
        />
      )}

      <AnimatePresence>
        {info && phase === "open" && (
          <motion.div
            key="info"
            className="scroll-area absolute inset-x-0 z-10 rounded-t-work bg-raised text-ink"
            style={{ bottom: `calc(${bottomBar}px + var(--frame-bottom, 0px))`, height: infoHeight }}
            initial={{ y: infoHeight + bottomBar }}
            animate={{ y: 0 }}
            exit={{ y: infoHeight + bottomBar }}
            transition={sheetMotion}
          >
            <InfoPanel item={item} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(barsVisible || (info && phase === "open")) && (
          <motion.div
            key="bottom"
            className="absolute inset-x-0 bottom-0 z-20 flex items-start justify-around bg-black/70 text-white"
            style={{ height: `calc(${bottomBar}px + var(--frame-bottom, 0px))`, paddingTop: 6 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={quick}
          >
            {request.trash ? (
              <>
                <BarButton icon="restore" label="복구" onClick={() => removeCurrent("restore")} />
                <BarButton icon="trash" label="영구 삭제" onClick={() => ui.openSheet({ kind: "purge", ids: [shownId] })} />
              </>
            ) : (
              <>
                <BarButton icon="heart" label={favorite ? "즐겨찾기 해제" : "즐겨찾기"} active={favorite} fill={favorite} onClick={toggleFavorite} />
                <BarButton icon="info" label="정보" active={info} onClick={() => setInfo((open) => !open)} />
                <BarButton icon="trash" label="휴지통으로 옮기기" onClick={() => removeCurrent("trash")} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

function BarButton({
  icon,
  label,
  active = false,
  fill = false,
  onClick,
}: {
  icon: "heart" | "info" | "trash" | "restore";
  label: string;
  active?: boolean;
  fill?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={icon === "heart" || icon === "info" ? active : undefined}
      className={`grid size-12 place-items-center ${active ? "text-accent-stage" : "text-white"}`}
      onClick={onClick}
    >
      <Icon name={icon} fill={fill} />
    </button>
  );
}

type BoxState = Box & { opacity: number; scale: number };

function PhotoBox({
  item,
  current,
  from,
  to,
  clip,
  transforms,
  videoRef,
  onVideo,
  onOpened,
}: {
  item: MediaItem;
  current: boolean;
  from: BoxState | null;
  to: BoxState;
  clip: boolean;
  transforms: { zoom: MotionValue<number>; panX: MotionValue<number>; panY: MotionValue<number> } | null;
  videoRef: RefObject<HTMLVideoElement | null> | null;
  onVideo: (patch: { playing?: boolean; time?: number }) => void;
  onOpened?: () => void;
}) {
  return (
    <motion.div
      className="absolute bg-cover bg-center"
      initial={from ?? false}
      animate={to}
      transition={photoSpring}
      onAnimationComplete={onOpened}
      style={{ backgroundImage: `url(${item.thumb})`, overflow: clip ? "hidden" : "visible" }}
    >
      <motion.div
        className="h-full w-full"
        style={transforms ? { scale: transforms.zoom, x: transforms.panX, y: transforms.panY } : undefined}
      >
        {item.kind === "video" && current && videoRef ? (
          <video
            ref={videoRef}
            src={item.src}
            poster={item.thumb}
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            onPlay={() => onVideo({ playing: true })}
            onPause={() => onVideo({ playing: false })}
            onEnded={() => onVideo({ playing: false })}
            onTimeUpdate={(event) => onVideo({ time: event.currentTarget.currentTime })}
          />
        ) : (
          <img src={item.kind === "photo" ? item.src : item.thumb} alt="" draggable={false} className="h-full w-full object-cover" />
        )}
      </motion.div>
    </motion.div>
  );
}

function VideoControls({ seconds, time, playing, onToggle }: { seconds: number; time: number; playing: boolean; onToggle: () => void }) {
  const progress = seconds > 0 ? Math.min(time / seconds, 1) : 0;
  return (
    <>
      {!playing && (
        <button
          type="button"
          aria-label="재생"
          className="absolute top-1/2 left-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
          onClick={onToggle}
        >
          <Icon name="play" size={28} />
        </button>
      )}
      <div
        className="absolute inset-x-0 z-10 flex items-center gap-3 px-4 text-white"
        style={{ bottom: `calc(${bottomBar + 8}px + var(--frame-bottom, 0px))` }}
      >
        <button type="button" aria-label={playing ? "일시정지" : "재생"} className="grid size-9 place-items-center" onClick={onToggle}>
          <Icon name={playing ? "pause" : "play"} size={20} />
        </button>
        <span className="num w-9 text-[12px] font-semibold">{duration(time)}</span>
        <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
          <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="num w-9 text-right text-[12px] font-semibold">{duration(seconds)}</span>
      </div>
    </>
  );
}
