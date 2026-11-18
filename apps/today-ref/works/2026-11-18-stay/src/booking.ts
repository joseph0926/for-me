import type { DateRange } from "./dates";

export interface Receipt {
  code: string;
  stayName: string;
  roomName: string;
  range: DateRange;
  nights: number;
  guestsText: string;
  total: number;
}

/** 예약 상자의 진행 상태. 확정 화면은 예약한 순간의 내역을 그대로 보여 준다. */
export type BookingState =
  | { kind: "idle" }
  | { kind: "submitting"; receipt: Receipt }
  | { kind: "confirmed"; receipt: Receipt };
