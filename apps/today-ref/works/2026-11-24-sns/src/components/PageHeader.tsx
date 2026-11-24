// 가운데 단 머리 줄. 늘 위에 붙어 있고, 맨 위에서는 경계가 없다가 스크롤하면 아래에 옅은 그림자가 생긴다(tastepin 헤더).
import { useSyncExternalStore, type ReactNode } from "react";

import { goBack } from "../history";
import { BackIcon } from "./Icons";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function useScrolled() {
  return useSyncExternalStore(subscribe, () => window.scrollY > 4);
}

export function PageHeader({
  title,
  subtitle,
  back = false,
  trailing,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const scrolled = useScrolled();
  return (
    <header
      className={`sticky top-0 z-20 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md transition-shadow duration-[120ms] ${
        scrolled ? "shadow-[0_1px_0_var(--line),0_6px_16px_rgb(0_0_0/0.06)]" : ""
      }`}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button
            type="button"
            aria-label="뒤로"
            onClick={goBack}
            className="-ml-2 grid size-9 place-items-center rounded-md hover:bg-[var(--hover)]"
          >
            <BackIcon size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-tight font-[650]">{title}</h1>
          {subtitle && <div className="truncate text-[14px] text-[var(--muted)]">{subtitle}</div>}
        </div>
        {trailing}
      </div>
      {children}
    </header>
  );
}
