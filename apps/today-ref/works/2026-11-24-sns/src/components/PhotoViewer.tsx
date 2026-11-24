// 사진 크게 보기. 뒤를 어둡게 흐리고 0.96배에서 커지며 열린다. 여러 장이면 좌우 화살표와 방향키로 넘기고, 넘길 때 24px 밀리며 2px 흐림을 거친다.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { Photo } from "../data";
import { dialogTransition, pageShift, pageTransition } from "../motion";
import { ChevronIcon, CloseIcon } from "./Icons";

export function PhotoViewer({ photos, initialIndex, onClose }: { photos: Photo[]; initialIndex: number; onClose: () => void }) {
  const [view, setView] = useState({ index: initialIndex, direction: 1 });
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[view.index];
  const many = photos.length > 1;

  const go = (step: number) =>
    setView((current) => {
      const index = current.index + step;
      return index < 0 || index >= photos.length ? current : { index, direction: step };
    });

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
  });

  useEffect(() => {
    closeRef.current?.focus();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-[4px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={dialogTransition}
      onClick={onClose}
    >
      <motion.figure
        className="relative grid size-full place-items-center px-4 py-16 md:px-20"
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.96 }}
        transition={dialogTransition}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={view.direction}>
          <motion.img
            key={photo.src + view.index}
            src={photo.src}
            alt={photo.alt}
            custom={view.direction}
            variants={{
              enter: (direction: number) => ({ x: direction * pageShift, opacity: 0, filter: "blur(2px)" }),
              center: { x: 0, opacity: 1, filter: "blur(0px)" },
              exit: (direction: number) => ({ x: -direction * pageShift, opacity: 0, filter: "blur(2px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-md object-contain"
          />
        </AnimatePresence>
        <figcaption className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[14px] text-white/75 tabular-nums">
          {many ? `${view.index + 1} / ${photos.length} · ` : ""}
          {photo.alt}
        </figcaption>
      </motion.figure>

      <button
        ref={closeRef}
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
      >
        <CloseIcon size={20} />
      </button>
      {many && (
        <>
          <ArrowButton side="left" disabled={view.index === 0} onClick={() => go(-1)} />
          <ArrowButton side="right" disabled={view.index === photos.length - 1} onClick={() => go(1)} />
        </>
      )}
    </motion.div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md bg-white/10 text-white transition-opacity duration-150 hover:bg-white/20 disabled:opacity-0 ${
        side === "left" ? "left-3 md:left-6" : "right-3 md:right-6"
      }`}
    >
      <ChevronIcon direction={side} size={22} />
    </button>
  );
}
