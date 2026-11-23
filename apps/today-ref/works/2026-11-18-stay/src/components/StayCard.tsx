import { AnimatePresence, motion, type Variants } from "motion/react";
import { type ReactNode, useRef, useState } from "react";

import { type Stay, lowestPrice } from "../data";
import { quote, won } from "../pricing";
import { ChevronLeft, ChevronRight, HeartIcon, StarIcon } from "./icons";
import { StayPhoto, photoSrc } from "./StayPhoto";

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

// 새 사진은 넘기는 방향 쪽 24px에서 흐림이 걷히며 들어와 이전 사진을 덮는다.
// 이전 사진은 밑에서 자리를 지켜, 새 사진이 다 들어오기 전에 바탕이 비치지 않는다.
const photoSlide: Variants = {
  enter: (direction: number) => ({ x: 24 * direction, opacity: 0, filter: "blur(2px)", zIndex: 1 }),
  center: { x: 0, opacity: 1, filter: "blur(0px)", zIndex: 1 },
  exit: { filter: "blur(2px)", zIndex: 0 },
};

export function StayCard({
  stay,
  nights,
  highlighted,
  pinned,
  justViewed,
  saved,
  onOpen,
  onToggleSave,
  onHoverChange,
  cardRef,
}: {
  stay: Stay;
  nights: number;
  highlighted: boolean;
  /** 지도에서 누른 숙소. 마우스를 올렸을 때(highlighted)보다 진하게 표시한다. */
  pinned: boolean;
  /** 상세에서 막 돌아온 숙소. 옅은 면을 1초 둔 뒤 걷는다. */
  justViewed: boolean;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  onHoverChange: (hovering: boolean) => void;
  cardRef: (element: HTMLElement | null) => void;
}) {
  const [photo, setPhoto] = useState({ index: 0, direction: 1 });
  // 마지막으로 누른 화살표가 가리키는 사진. 사진을 다 불러오기 전에 여러 번 눌러도 이 값부터 센다.
  const targetIndex = useRef(0);
  const nightly = lowestPrice(stay);
  const price = quote(nightly, nights, stay.cleaningFee);

  // 화살표가 보이기 시작할 때 나머지 사진을 미리 받아 둔다.
  function preloadPhotos() {
    for (const scene of stay.photos) new Image().src = photoSrc(scene, stay.tone);
  }

  // 사진을 다 그릴 수 있게 된 뒤에 바꾼다. 그 사이 다른 사진을 고르면 앞의 요청은 버린다.
  function showPhoto(step: number) {
    const next = (targetIndex.current + step + stay.photos.length) % stay.photos.length;
    targetIndex.current = next;
    const image = new Image();
    image.src = photoSrc(stay.photos[next], stay.tone);
    image
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (targetIndex.current === next) setPhoto({ index: next, direction: step });
      });
  }

  const surface = pinned ? "bg-canvas ring-2 ring-ink" : highlighted ? "bg-canvas" : "";

  return (
    <article
      ref={cardRef}
      onMouseEnter={() => {
        onHoverChange(true);
        preloadPhotos();
      }}
      onMouseLeave={() => onHoverChange(false)}
      // 카드 어디를 눌러도 상세로 간다. 사진 화살표와 찜 버튼은 이벤트를 여기까지 올리지 않는다.
      onClick={onOpen}
      className={`group relative -m-2 cursor-pointer scroll-mt-28 rounded-2xl p-2 transition-[background-color,box-shadow] duration-150 ${surface} ${justViewed ? "just-viewed" : ""}`}
    >
      <div className="relative aspect-[20/17] overflow-hidden rounded-xl bg-canvas">
        <AnimatePresence initial={false} custom={photo.direction}>
          <motion.div
            key={photo.index}
            custom={photo.direction}
            variants={photoSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease: EASE_OUT_CUBIC }}
            className="absolute inset-0"
          >
            <StayPhoto tone={stay.tone} scene={stay.photos[photo.index]} />
          </motion.div>
        </AnimatePresence>
        {stay.badge && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]">
            {stay.badge === "인기" ? "예약 많은 숙소" : "새로 열었어요"}
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave();
          }}
          aria-label={saved ? "찜 해제" : "찜하기"}
          aria-pressed={saved}
          className="absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)] hover:scale-105"
        >
          <HeartIcon size={24} filled={saved} className={saved ? "text-[#e0475b]" : ""} strokeWidth={2} />
        </button>
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 flex -translate-y-1/2 justify-between opacity-0 transition-opacity group-hover:opacity-100">
          <PhotoArrow label="이전 사진" onClick={() => showPhoto(-1)}>
            <ChevronLeft size={16} />
          </PhotoArrow>
          <PhotoArrow label="다음 사진" onClick={() => showPhoto(1)}>
            <ChevronRight size={16} />
          </PhotoArrow>
        </div>
        <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1">
          {stay.photos.map((scene, index) => (
            <span
              key={scene}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${index === photo.index ? "bg-white" : "bg-white/55"}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[15px] font-semibold leading-snug">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="text-left"
            >
              {stay.name}
            </button>
          </h3>
          <span className="tabular flex shrink-0 items-center gap-1 text-[14px]">
            <StarIcon size={13} />
            {stay.rating.toFixed(2)}
            <span className="text-muted">({stay.reviewCount.toLocaleString("ko-KR")})</span>
          </span>
        </div>
        <p className="mt-0.5 truncate text-[14px] text-muted">
          {stay.area} {stay.type}, {stay.access}
        </p>
        <p className="mt-2 text-[15px]">
          <span className="tabular font-semibold">{won(nightly)}</span>
          <span className="text-muted"> /박</span>
        </p>
        {nights > 0 && (
          <p className="tabular text-[14px] text-muted">
            {nights}박 총 <span className="underline underline-offset-2">{won(price.total)}</span>
          </p>
        )}
        {stay.cancellation.kind === "free" && (
          <p className="mt-2 inline-block rounded bg-accent-soft px-1.5 py-0.5 text-[12px] font-medium text-accent">무료 취소</p>
        )}
      </div>
    </article>
  );
}

function PhotoArrow({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow-[0_1px_3px_rgb(0_0_0/0.2)] hover:bg-white"
    >
      {children}
    </button>
  );
}
