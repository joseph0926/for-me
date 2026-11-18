import type { ReactNode } from "react";

// 앱 주제를 데스크톱 브라우저에서 휴대폰 크기로 보여 준다. 좁은 화면에서는 틀 없이 화면 전체를 쓴다.
// 크기는 iPhone 15/16의 CSS 픽셀(393 x 852) 기준이다.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--backdrop)] sm:grid sm:place-items-center sm:p-6">
      <div
        className="
          relative isolate h-dvh w-full overflow-hidden bg-[var(--surface)]
          sm:h-[852px] sm:max-h-[calc(100dvh-48px)] sm:w-[393px] sm:rounded-[48px]
          sm:shadow-[0_0_0_10px_var(--bezel),0_30px_80px_-20px_rgb(0_0_0/0.45)]
        "
      >
        {children}
      </div>
    </div>
  );
}
