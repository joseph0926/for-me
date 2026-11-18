import { type ReactNode, useState } from "react";

import { type Stay, lowestPrice } from "../data";
import { quote, won } from "../pricing";
import { ChevronLeft, ChevronRight, HeartIcon, StarIcon } from "./icons";
import { StayPhoto } from "./StayPhoto";

export function StayCard({
  stay,
  nights,
  highlighted,
  saved,
  onOpen,
  onToggleSave,
  onHoverChange,
  cardRef,
}: {
  stay: Stay;
  nights: number;
  highlighted: boolean;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  onHoverChange: (hovering: boolean) => void;
  cardRef: (element: HTMLElement | null) => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const nightly = lowestPrice(stay);
  const price = quote(nightly, nights, stay.cleaningFee);

  function showPhoto(step: number) {
    setPhotoIndex((index) => (index + step + stay.photos.length) % stay.photos.length);
  }

  return (
    <article
      ref={cardRef}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      // 카드 어디를 눌러도 상세로 간다. 사진 화살표와 찜 버튼은 이벤트를 여기까지 올리지 않는다.
      onClick={onOpen}
      className={`group relative -m-2 cursor-pointer scroll-mt-28 rounded-2xl p-2 transition-colors duration-150 ${highlighted ? "bg-canvas" : ""}`}
    >
      <div className="relative aspect-[20/17] overflow-hidden rounded-xl bg-canvas">
        <StayPhoto tone={stay.tone} scene={stay.photos[photoIndex]} />
        {stay.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]">
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
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
          {stay.photos.map((scene, index) => (
            <span
              key={scene}
              className={`h-1.5 w-1.5 rounded-full ${index === photoIndex ? "bg-white" : "bg-white/55"}`}
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
