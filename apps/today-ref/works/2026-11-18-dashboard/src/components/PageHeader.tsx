import { useEffect, useState, type ReactNode } from "react";

import { NOW } from "../data";
import { formatClock, formatDay } from "../format";
import { Icon } from "../icons";
import { RollingNumber } from "./RollingNumber";

interface TopBarProps {
  trail: string[];
  onOpenMenu: () => void;
}

// 이동 경로와 집계 기준 시각을 담는 맨 위 줄. 늘 위에 고정하고, 맨 위에서는 경계 없이 두다가
// 스크롤하면 아래에 옅은 그림자를 120ms에 깐다(tastepin 헤더 경계 값). 어두운 바탕이라 그림자를 시편보다 짙게 둔다.
export function TopBar({ trail, onOpenMenu }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-20 flex h-11 items-center gap-2 bg-canvas px-4 transition-shadow duration-[120ms] lg:px-8 ${
        scrolled ? "shadow-[0_8px_16px_-10px_rgb(0_0_0/0.8)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        className="press -ml-1.5 grid size-7 place-items-center rounded-md text-muted hover:bg-raised hover:text-ink lg:hidden"
      >
        <Icon name="menu" className="size-4" />
      </button>
      <nav aria-label="이동 경로" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {trail.map((item, index) => {
          const last = index === trail.length - 1;
          return (
            <span key={item} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <Icon name="chevronRight" className="size-3 shrink-0 text-faint" />}
              <span className={last ? "truncate text-ink" : "shrink-0 text-muted"}>{item}</span>
            </span>
          );
        })}
      </nav>
      <span className="tabular ml-auto hidden shrink-0 text-[12px] text-faint sm:block">
        {formatDay(NOW)} {formatClock(NOW)} KST 기준
      </span>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.015em] text-ink">{title}</h1>
      {children && <div className="mt-1 flex items-center gap-3 text-[14px] text-muted">{children}</div>}
    </div>
  );
}

// 현재 접속자 수. 실시간 연결 대신 몇 초마다 조금씩 흔들리게 한다.
export function LiveCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount((c) => Math.max(1, c + Math.round((Math.random() - 0.5) * Math.max(3, initial * 0.12))));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [initial]);

  return (
    <span className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-good" />
      <RollingNumber value={count} text={`${count}명`} className="tabular text-ink-2" /> 접속 중
    </span>
  );
}
