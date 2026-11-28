// 여러 화면이 함께 쓰는 상태 연결, 시계, 가격 표시와 버튼 모양.
import { createContext, use, useSyncExternalStore, type ComponentProps, type Dispatch } from "react";

import { CurrencyIcon } from "./art";
import type { Currency } from "./data";
import type { Action, ShopState } from "./shop";

export const ShopContext = createContext<{ state: ShopState; dispatch: Dispatch<Action> } | null>(null);

export function useShop() {
  const value = use(ShopContext);
  if (!value) throw new Error("ShopContext 밖에서 useShop을 불렀습니다");
  return value;
}

// 남은 시간 표시들이 타이머 하나를 나눠 쓴다. 보는 화면이 없으면 타이머를 멈춘다.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = Date.now();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now);
}

export const openedAt = Date.now();

export function formatRemaining(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const clock = [Math.floor((total % 86400) / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return days > 0 ? `${days}일 ${clock}` : clock;
}

export function Remaining({ endsIn, className = "" }: { endsIn: number; className?: string }) {
  const current = useNow();
  return (
    <span className={`inline-flex items-center gap-1.5 tabular font-bold ${className}`}>
      <ClockIcon />
      <span className="sr-only">남은 시간</span>
      {formatRemaining(openedAt + endsIn - current)}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.6 V8 L10.4 9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export const numberFormat = new Intl.NumberFormat("ko-KR");

export function Price({ currency, amount, className = "" }: { currency: Currency; amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 tabular font-extrabold ${className}`}>
      <CurrencyIcon currency={currency} />
      {numberFormat.format(amount)}
    </span>
  );
}

// 버튼은 두 벌이다. 주 버튼은 하늘색 면, 보조 버튼은 1px 테두리.
type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" };

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonProps) {
  const look =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:brightness-95 disabled:hover:brightness-100"
      : "border border-line text-ink hover:bg-raised disabled:hover:bg-transparent";
  // 쓸 수 없을 때는 모양을 그대로 두고 전체를 흐리게 하고, 모션 감소 설정에서는 누름 크기 변화를 생략한다(tastepin 버튼 값).
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-work px-5 text-[15px] font-extrabold transition-[filter,background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 motion-reduce:active:scale-100 ${look} ${className}`}
      {...props}
    />
  );
}
