import type { ReactNode } from "react";

import { ChevronLeftIcon } from "./Icons";

// 화면 공통의 위아래 틀: 내비게이션 막대, 팔로우 버튼, 데스크톱 틀 안의 상태 표시줄.

export function NavBar({ title, onBack, trailing }: { title?: string; onBack?: () => void; trailing?: ReactNode }) {
  return (
    <header className="relative flex h-11 shrink-0 items-center px-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="relative z-10 flex h-11 items-center gap-0.5 pr-3 text-[17px] active:opacity-50"
        >
          <ChevronLeftIcon size={24} strokeWidth={2} />
          뒤로
        </button>
      )}
      {title && (
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold">{title}</h1>
      )}
      {trailing && <div className="relative z-10 ml-auto flex items-center">{trailing}</div>}
    </header>
  );
}

export function FollowButton({ isFollowing, onToggle }: { isFollowing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isFollowing}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`hit h-[34px] min-w-[92px] shrink-0 rounded-[10px] border border-line-strong px-4 text-[15px] font-semibold active:opacity-60 ${
        isFollowing ? "text-muted" : "text-ink"
      }`}
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </button>
  );
}

// 데스크톱 휴대폰 틀에서만 보인다. 실제 휴대폰에서는 기기의 상태 표시줄이 있다.
export function StatusBar() {
  return (
    <div className="hidden h-full items-center justify-between pl-[42px] pr-[30px] pt-1 sm:flex" aria-hidden="true">
      <span className="text-[17px] font-semibold tracking-[-0.01em]">9:41</span>
      <span className="flex items-center gap-[7px]">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.3A10.2 10.2 0 0 0 8 .5 10.2 10.2 0 0 0 .8 3.4L2 4.7a8.4 8.4 0 0 1 6-2.4Z" />
          <path d="M8 5.8c1.4 0 2.6.5 3.6 1.4l1.2-1.3A7 7 0 0 0 8 4a7 7 0 0 0-4.8 1.9l1.2 1.3c1-.9 2.2-1.4 3.6-1.4Z" />
          <path d="M8 9.2c.5 0 1 .2 1.3.5L8 11.5 6.7 9.7c.3-.3.8-.5 1.3-.5Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2 left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink sm:block"
    />
  );
}

export function LargeTitle({ children }: { children: ReactNode }) {
  return <h1 className="px-4 pb-2 pt-1.5 text-[32px] font-bold leading-[40px] tracking-[-0.02em]">{children}</h1>;
}
