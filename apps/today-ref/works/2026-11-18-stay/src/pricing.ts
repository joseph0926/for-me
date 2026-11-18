// 카드의 총액과 예약 상자의 요금 내역이 같은 계산을 쓰도록 한곳에 둔다.

export const SERVICE_FEE_RATE = 0.06;

export interface Quote {
  nightly: number;
  nights: number;
  lodging: number;
  cleaning: number;
  service: number;
  total: number;
}

export function quote(nightly: number, nights: number, cleaningFee: number): Quote {
  const lodging = nightly * nights;
  const cleaning = nights > 0 ? cleaningFee : 0;
  // 수수료는 10원 단위에서 반올림한다.
  const service = Math.round((lodging * SERVICE_FEE_RATE) / 10) * 10;
  return { nightly, nights, lodging, cleaning, service, total: lodging + cleaning + service };
}

export function won(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** 지도 마커처럼 좁은 곳에 쓰는 만 원 단위 표기. 128000 -> "12.8만" */
export function wonCompact(amount: number) {
  const tenThousands = Math.round(amount / 1000) / 10;
  return `${Number.isInteger(tenThousands) ? tenThousands.toFixed(0) : tenThousands.toFixed(1)}만`;
}
