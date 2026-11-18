import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";

import type { BookingState } from "../booking";
import { AREAS, type Stay, amenityLabel, cancellationText, maxCapacity } from "../data";
import { formatShort, nightsBetween } from "../dates";
import { quote, won } from "../pricing";
import { type SearchCriteria, guestsLabel, totalGuests } from "../search";
import { BookingBox } from "./BookingBox";
import { AmenityIcon, ChevronLeft, GridIcon, HeartIcon, StarIcon } from "./icons";
import { StayMap } from "./StayMap";
import { StayPhoto } from "./StayPhoto";

const CONFIRM_DELAY_MS = 900;

export function DetailPage({
  stay,
  criteria,
  onCriteriaChange,
  saved,
  onToggleSave,
  onBack,
}: {
  stay: Stay;
  criteria: SearchCriteria;
  onCriteriaChange: (criteria: SearchCriteria) => void;
  saved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
}) {
  const guestCount = totalGuests(criteria.guests);
  const [roomId, setRoomId] = useState(
    () => (stay.rooms.find((room) => room.capacity >= guestCount) ?? stay.rooms[0]).id,
  );
  const [booking, setBooking] = useState<BookingState>({ kind: "idle" });
  const [galleryOpen, setGalleryOpen] = useState(false);

  const room = stay.rooms.find((candidate) => candidate.id === roomId) ?? stay.rooms[0];
  const nights = nightsBetween(criteria.range);
  const price = quote(room.price, nights, stay.cleaningFee);
  const district = AREAS.find((area) => area.name === stay.area)?.district ?? "";

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 가짜 결제 요청이 끝나면 확정 화면으로 넘긴다. 상세를 떠나면 타이머를 버린다.
  useEffect(() => {
    if (booking.kind !== "submitting") return;
    const timer = window.setTimeout(() => setBooking({ kind: "confirmed", receipt: booking.receipt }), CONFIRM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [booking]);

  function reserve() {
    if (!criteria.range || guestCount > room.capacity || booking.kind !== "idle") return;
    setBooking({
      kind: "submitting",
      receipt: {
        code: `MG${criteria.range.checkIn.slice(2).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`,
        stayName: stay.name,
        roomName: room.name,
        range: criteria.range,
        nights,
        guestsText: guestsLabel(criteria.guests),
        total: price.total,
      },
    });
  }

  return (
    <main className="mx-auto max-w-[1160px] px-4 pb-32 pt-5 sm:px-6 lg:pb-20">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex h-9 items-center gap-1 rounded-lg px-2 text-[14px] font-medium hover:bg-canvas"
      >
        <ChevronLeft size={18} />
        검색 결과
      </button>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] sm:text-[26px]">{stay.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
            <span className="tabular flex items-center gap-1 font-medium">
              <StarIcon size={14} />
              {stay.rating.toFixed(2)}
            </span>
            <span className="tabular underline underline-offset-4">후기 {stay.reviewCount.toLocaleString("ko-KR")}개</span>
            <Divider />
            <span className="text-muted">
              서울 {district} {stay.area}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[14px] font-medium underline-offset-4 hover:bg-canvas"
        >
          <HeartIcon size={18} filled={saved} className={saved ? "text-[#e0475b]" : ""} />
          {saved ? "저장됨" : "저장"}
        </button>
      </div>

      <div className="relative mt-5 grid h-[260px] grid-cols-1 gap-2 overflow-hidden rounded-xl sm:h-[380px] md:grid-cols-4 md:grid-rows-2 lg:h-[440px]">
        {stay.photos.map((scene, index) => (
          <button
            key={scene}
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={`사진 ${index + 1} 크게 보기`}
            className={`overflow-hidden bg-canvas transition-[filter] hover:brightness-95 ${index === 0 ? "md:col-span-2 md:row-span-2" : "hidden md:block"}`}
          >
            <StayPhoto tone={stay.tone} scene={scene} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="absolute bottom-4 right-4 flex h-9 items-center gap-1.5 rounded-lg border border-ink/70 bg-white px-3 text-[14px] font-medium hover:bg-canvas"
        >
          <GridIcon size={16} />
          사진 {stay.photos.length}장 모두 보기
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="min-w-0">
          <section>
            <h2 className="text-[21px] font-semibold tracking-[-0.01em]">
              {stay.area}의 {stay.type}
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              최대 {maxCapacity(stay)}명, 객실 {stay.rooms.length}종, {stay.access}
            </p>

            <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line py-4 text-center">
              <div>
                <p className="tabular text-[20px] font-semibold">{stay.rating.toFixed(2)}</p>
                <Stars rating={stay.rating} />
              </div>
              <div>
                <p className="tabular text-[20px] font-semibold">{stay.reviewCount.toLocaleString("ko-KR")}</p>
                <p className="text-[13px] text-muted">후기</p>
              </div>
              <div className="px-3">
                <p className="text-[16px] font-semibold leading-[30px]">
                  {stay.cancellation.kind === "free" ? "무료 취소" : "부분 환불"}
                </p>
                <p className="text-[13px] text-muted">체크인 {stay.cancellation.kind === "none" ? 0 : stay.cancellation.daysBefore}일 전까지</p>
              </div>
            </div>

            <p className="mt-6 text-[15px] leading-7">{stay.description}</p>
          </section>

          <Section title="객실 선택">
            <div className="space-y-3" role="radiogroup" aria-label="객실">
              {stay.rooms.map((option) => {
                const selected = option.id === room.id;
                const tooSmall = option.capacity < guestCount;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRoomId(option.id)}
                    className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                      selected ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${selected ? "border-accent" : "border-line-strong"}`}
                      >
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold">{option.name}</span>
                        <span className="mt-0.5 block text-[14px] text-muted">
                          {option.bed}, {option.sizeM2}㎡
                        </span>
                        <span className={`mt-0.5 block text-[14px] ${tooSmall ? "text-[#b4412f]" : "text-muted"}`}>
                          최대 {option.capacity}명{tooSmall ? ", 선택한 인원보다 작아요" : ""}
                        </span>
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-right">
                      <span className="block text-[16px] font-semibold">{won(option.price)}</span>
                      <span className="block text-[13px] text-muted">1박</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="편의시설">
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {stay.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-3.5 text-[15px]">
                  <AmenityIcon id={amenity} size={22} className="text-ink" />
                  {amenityLabel(amenity)}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="위치">
            <p className="text-[15px]">
              서울 {district} {stay.area}
              <span className="text-muted">, {stay.access}</span>
            </p>
            <div className="mt-4 h-[300px] overflow-hidden rounded-xl border border-line sm:h-[340px]">
              <StayMap stays={[stay]} focus={stay.pos} initialZoom={1} variant="pin" />
            </div>
          </Section>

          <Section title="알아 두어야 할 사항">
            <div className="grid gap-8 text-[15px] sm:grid-cols-2">
              <div>
                <h3 className="font-semibold">이용 규칙</h3>
                <ul className="mt-2 space-y-1.5 text-muted">
                  <li>체크인 {stay.checkIn} 이후</li>
                  <li>체크아웃 {stay.checkOut} 이전</li>
                  <li>객실별 최대 인원 초과 불가</li>
                  <li>실내 흡연 금지</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">취소 정책</h3>
                <ul className="mt-2 space-y-1.5 text-muted">
                  <li>{cancellationText(stay.cancellation)}</li>
                  <li>그 이후 취소 시 첫 1박 요금 부과</li>
                  <li>체크인 당일 취소와 노쇼는 환불 불가</li>
                </ul>
              </div>
            </div>
          </Section>
        </div>

        <aside>
          <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
            <BookingBox
              stay={stay}
              room={room}
              criteria={criteria}
              onCriteriaChange={onCriteriaChange}
              booking={booking}
              onReserve={reserve}
              onReset={() => setBooking({ kind: "idle" })}
            />
          </div>
        </aside>
      </div>

      <MobileReserveBar
        total={nights > 0 ? won(price.total) : `${won(room.price)} /박`}
        detail={criteria.range ? `${formatShort(criteria.range.checkIn)} - ${formatShort(criteria.range.checkOut)}` : "날짜를 선택하세요"}
        confirmed={booking.kind === "confirmed"}
        onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      <AnimatePresence>{galleryOpen && <Gallery stay={stay} onClose={() => setGalleryOpen(false)} />}</AnimatePresence>
    </main>
  );
}

function Divider() {
  return <span className="h-3.5 w-px bg-line-strong" aria-hidden="true" />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-line pt-10">
      <h2 className="mb-5 text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="mt-1 flex justify-center gap-0.5" aria-label={`별점 ${rating}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} size={11} className={index < full ? "text-ink" : "text-line-strong"} />
      ))}
    </span>
  );
}

function MobileReserveBar({
  total,
  detail,
  confirmed,
  onClick,
}: {
  total: string;
  detail: string;
  confirmed: boolean;
  onClick: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-white px-4 py-3 lg:hidden">
      <div className="min-w-0">
        <p className="tabular text-[16px] font-semibold">{total}</p>
        <p className="tabular truncate text-[13px] text-muted underline underline-offset-2">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="h-11 shrink-0 rounded-lg bg-accent px-6 text-[15px] font-semibold text-white hover:bg-accent-hover"
      >
        {confirmed ? "예약 내역" : "예약하기"}
      </button>
    </div>
  );
}

function Gallery({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-label={`${stay.name} 사진`}
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22 }}
    >
      <div className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-line bg-white px-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="-ml-2 flex h-9 items-center gap-1 rounded-lg px-2 text-[14px] font-medium hover:bg-canvas"
        >
          <ChevronLeft size={18} />
          돌아가기
        </button>
        <span className="truncate text-[15px] font-semibold">{stay.name}</span>
      </div>
      <div className="mx-auto grid max-w-[880px] grid-cols-2 gap-2 px-4 py-8 sm:px-6">
        {stay.photos.map((scene, index) => (
          <div key={scene} className={`overflow-hidden rounded-lg ${index % 3 === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[4/3]"}`}>
            <StayPhoto tone={stay.tone} scene={scene} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
