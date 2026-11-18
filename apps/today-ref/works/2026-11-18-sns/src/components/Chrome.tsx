import type { ReactNode } from "react";

import { ChevronLeftIcon } from "./Icons";

// 화면 공통의 위아래 틀: 내비게이션 막대와 팔로우 버튼.

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

export function LargeTitle({ children }: { children: ReactNode }) {
  return <h1 className="px-4 pb-2 pt-1.5 text-[32px] font-bold leading-[40px] tracking-[-0.02em]">{children}</h1>;
}
