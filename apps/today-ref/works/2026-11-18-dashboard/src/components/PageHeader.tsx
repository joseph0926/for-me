import { useEffect, useState, type ReactNode } from "react";

import { NOW } from "../data";
import { formatClock, formatDay } from "../format";
import { Icon } from "../icons";

interface TopBarProps {
  trail: string[];
  onOpenMenu: () => void;
}

// 이동 경로와 집계 기준 시각을 담는 맨 위 줄.
export function TopBar({ trail, onOpenMenu }: TopBarProps) {
  return (
    <div className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-line-soft bg-canvas/90 px-4 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        className="-ml-1.5 grid size-7 place-items-center rounded-md text-muted hover:bg-raised hover:text-ink lg:hidden"
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
      {children && <div className="mt-1 flex items-center gap-3 text-[13px] text-muted">{children}</div>}
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
      <span className="tabular text-ink-2">{count}명</span> 접속 중
    </span>
  );
}
