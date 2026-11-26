import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useRef, useState } from "react";

import type { BookingState, Receipt } from "../booking";
import type { Room, Stay } from "../data";
import { formatShort, nightsBetween } from "../dates";
import { useDismiss } from "../hooks";
import { quote, won } from "../pricing";
import { type SearchCriteria, guestsLabel, totalGuests } from "../search";
import { Calendar } from "./Calendar";
import { GuestStepper } from "./GuestStepper";
import { CheckIcon, ChevronDown } from "./icons";
import { Popover } from "./Popover";

type Panel = "dates" | "guests" | null;

export function BookingBox({
  stay,
  room,
  criteria,
  onCriteriaChange,
  booking,
  onReserve,
  onReset,
}: {
  stay: Stay;
  room: Room;
  criteria: SearchCriteria;
  onCriteriaChange: (criteria: SearchCriteria) => void;
  booking: BookingState;
  onReserve: () => void;
  onReset: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPanel(null), []);
  useDismiss(fieldsRef, panel !== null, close);

  if (booking.kind === "confirmed") {
    return (
      <BoxFrame>
        <Confirmation receipt={booking.receipt} onReset={onReset} />
      </BoxFrame>
    );
  }

  const nights = nightsBetween(criteria.range);
  const price = quote(room.price, nights, stay.cleaningFee);
  const overCapacity = totalGuests(criteria.guests) > room.capacity;
  const submitting = booking.kind === "submitting";

  return (
    <BoxFrame>
      {/* 평점은 상세 제목 아래에 있어 상자에서 되풀이하지 않는다. */}
      <p>
        <span className="tabular text-[22px] font-semibold tracking-[-0.01em]">{won(room.price)}</span>
        <span className="text-[15px] text-muted"> /박</span>
      </p>
      <p className="mt-0.5 text-[14px] text-muted">{room.name}</p>

      <div ref={fieldsRef} className="relative mt-5">
        <div className="rounded-md border border-line-strong">
          <div className="grid grid-cols-2">
            <Field label="체크인" value={criteria.range ? formatShort(criteria.range.checkIn) : null} onClick={() => setPanel("dates")} />
            <Field
              label="체크아웃"
              value={criteria.range ? formatShort(criteria.range.checkOut) : null}
              onClick={() => setPanel("dates")}
              className="border-l border-line-strong"
            />
          </div>
          <button
            type="button"
            onClick={() => setPanel(panel === "guests" ? null : "guests")}
            className="flex w-full items-center justify-between border-t border-line-strong px-3.5 py-2.5 text-left hover:bg-canvas"
          >
            <span>
              <span className="block text-[12px] text-muted">인원</span>
              <span className="block text-[15px] font-semibold">{guestsLabel(criteria.guests)}</span>
            </span>
            <ChevronDown size={18} className="text-muted" />
          </button>
        </div>

        <AnimatePresence>
          {panel === "dates" && (
            <Popover key="dates" sheet label="숙박 날짜" placement="sm:right-0 sm:w-[700px]" onClose={close}>
              <Calendar
                value={criteria.range}
                onChange={(range) => {
                  onCriteriaChange({ ...criteria, range });
                  if (range) close();
                }}
                onClose={close}
              />
            </Popover>
          )}
          {panel === "guests" && (
            <Popover key="guests" sheet label="인원" placement="sm:inset-x-0" onClose={close}>
              <GuestStepper guests={criteria.guests} onChange={(guests) => onCriteriaChange({ ...criteria, guests })} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

      {overCapacity && (
        <p className="mt-3 text-[14px] text-[#b4412f]">선택한 객실은 최대 {room.capacity}명까지 묵을 수 있습니다.</p>
      )}

      <button
        type="button"
        disabled={overCapacity || submitting}
        onClick={() => (criteria.range ? onReserve() : setPanel("dates"))}
        className={`press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-[16px] font-semibold text-white hover:bg-accent-hover disabled:hover:bg-accent ${overCapacity ? "disabled:bg-line-strong" : ""}`}
      >
        {submitting && (
          <motion.span
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        )}
        {submitting ? "예약하는 중" : criteria.range ? "예약하기" : "날짜 선택"}
      </button>

      {nights > 0 && (
        <div className="tabular mt-5 text-[15px]">
          <dl className="space-y-2.5">
            <PriceRow label={`${won(room.price)} × ${nights}박`} amount={price.lodging} />
            {price.cleaning > 0 && <PriceRow label="청소비" amount={price.cleaning} />}
            <PriceRow label="서비스 수수료" amount={price.service} />
          </dl>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
            <span>총 합계</span>
            <span>{won(price.total)}</span>
          </div>
        </div>
      )}
    </BoxFrame>
  );
}

function BoxFrame({ children }: { children: ReactNode }) {
  return (
    <div id="booking" className="scroll-mt-28 rounded-md border border-line bg-white p-6">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onClick,
  className = "",
}: {
  label: string;
  value: string | null;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`px-3.5 py-2.5 text-left hover:bg-canvas ${className}`}>
      <span className="block text-[12px] text-muted">{label}</span>
      <span className={`tabular block text-[15px] ${value ? "font-semibold" : "text-subtle"}`}>{value ?? "날짜 추가"}</span>
    </button>
  );
}

function PriceRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{won(amount)}</dd>
    </div>
  );
}

function Confirmation({ receipt, onReset }: { receipt: Receipt; onReset: () => void }) {
  const rows = [
    { label: "숙소", value: receipt.stayName },
    { label: "객실", value: receipt.roomName },
    {
      label: "일정",
      value: `${formatShort(receipt.range.checkIn)} - ${formatShort(receipt.range.checkOut)}, ${receipt.nights}박`,
    },
    { label: "인원", value: receipt.guestsText },
    { label: "결제 금액", value: won(receipt.total) },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
        <CheckIcon size={22} strokeWidth={2.2} />
      </span>
      <p className="mt-4 text-[19px] font-semibold">예약이 확정되었습니다</p>
      <p className="tabular mt-0.5 text-[14px] text-muted">예약 번호 {receipt.code}</p>
      <dl className="mt-5 divide-y divide-line border-y border-line text-[15px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-muted">{row.label}</dt>
            <dd className="tabular text-right font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 h-11 w-full rounded-md border border-ink text-[15px] font-semibold hover:bg-canvas"
      >
        다른 일정으로 예약하기
      </button>
    </motion.div>
  );
}
