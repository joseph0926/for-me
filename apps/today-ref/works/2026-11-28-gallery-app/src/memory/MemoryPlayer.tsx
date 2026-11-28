// 추억 재생(r2). 화면 전체 사진이 한 장씩 넘어가고 맨 위 진행 막대가 장마다 차오른다.
// 오른쪽을 누르면 다음, 왼쪽 3분의 1을 누르면 앞 장, 누르고 있으면 멈춘다.
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Icon } from "../components/Icon";
import { itemById, memories } from "../data";
import { useGallery } from "../gallery";
import { memorySlideMs, quick, sheet } from "../motion";

export function MemoryPlayer({ memoryId, onClose }: { memoryId: string; onClose: () => void }) {
  const gallery = useGallery();
  const memory = memories.find((entry) => entry.id === memoryId)!;
  const slides = memory.items.filter(gallery.isVisible).map((id) => itemById.get(id)!);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // 지금 장의 진행(0~1). 멈추면 그 자리에 서고, 다시 재생하면 남은 시간만큼 이어 간다.
  const progress = useMotionValue(0);
  const pressedAt = useRef(0);

  const running = !paused && !held;
  const last = slides.length - 1;

  useEffect(() => {
    if (!running) return;
    const remaining = (1 - progress.get()) * (memorySlideMs / 1000);
    const controls = animate(progress, 1, { duration: remaining, ease: "linear" });
    controls.then(() => {
      if (index < last) {
        progress.set(0);
        setIndex(index + 1);
      } else onClose();
    });
    return () => controls.stop();
  }, [running, index, last, progress, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === " ") setPaused((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function step(direction: 1 | -1) {
    const next = index + direction;
    if (next > last) {
      onClose();
      return;
    }
    progress.set(0);
    setIndex(Math.max(0, next));
  }

  if (slides.length === 0) return null;
  const slide = slides[Math.min(index, last)];

  return (
    <motion.div
      data-frame-tone="dark"
      role="dialog"
      aria-modal="true"
      aria-label={`추억: ${memory.title}`}
      className="absolute inset-x-0 z-30 overflow-hidden bg-stage text-white select-none"
      style={{ top: "calc(-1 * var(--frame-top, 0px))", bottom: "calc(-1 * var(--frame-bottom, 0px))" }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={sheet}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={slide.id}
          src={slide.kind === "photo" ? slide.src : slide.thumb}
          alt=""
          draggable={false}
          className="memory-drift absolute inset-0 h-full w-full object-cover"
          style={{ animationPlayState: running ? "running" : "paused" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-black/0" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/65 to-black/0" />

      <div
        className="absolute inset-0"
        onPointerDown={() => {
          pressedAt.current = performance.now();
          setHeld(true);
        }}
        onPointerUp={(event) => {
          setHeld(false);
          // 길게 눌러 멈췄던 것은 넘기지 않는다
          if (performance.now() - pressedAt.current > 300) return;
          const rect = event.currentTarget.getBoundingClientRect();
          step(event.clientX - rect.left < rect.width / 3 ? -1 : 1);
        }}
        onPointerLeave={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
      />

      <div className="absolute inset-x-0 top-0 flex flex-col gap-2 px-3" style={{ paddingTop: "calc(var(--frame-top, 0px) + 8px)" }}>
        <div className="flex gap-1" aria-hidden="true">
          {slides.map((entry, position) => (
            <span key={entry.id} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
              {position < index && <span className="absolute inset-0 bg-white" />}
              {position === index && <Fill progress={progress} />}
            </span>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" aria-label="추억 닫기" className="grid size-10 place-items-center" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 flex items-end justify-between gap-3 px-5" style={{ bottom: "calc(var(--frame-bottom, 0px) + 24px)" }}>
        <div className="on-photo min-w-0">
          <p className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{memory.title}</p>
          <p className="num mt-1 text-[14px] font-semibold opacity-90">{memory.subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={paused ? "추억 재생" : "추억 일시정지"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-black/35"
          onClick={() => setPaused((value) => !value)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={paused ? "play" : "pause"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={quick}>
              <Icon name={paused ? "play" : "pause"} size={20} />
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}

function Fill({ progress }: { progress: MotionValue<number> }) {
  const width = useTransform(progress, (value) => `${value * 100}%`);
  return <motion.span className="absolute inset-y-0 left-0 bg-white" style={{ width }} />;
}
