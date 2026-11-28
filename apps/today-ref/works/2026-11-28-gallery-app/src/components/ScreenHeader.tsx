// 화면 맨 위 머리줄. 평소에는 큰 제목과 개수, 선택 중에는 취소와 고른 장수를 보여 준다.
import type { ReactNode } from "react";

import { useUi } from "../ui";
import { Icon } from "./Icon";

export function ScreenHeader({
  title,
  subtitle,
  scope,
  canSelect,
  onBack,
  trailing,
}: {
  title: string;
  subtitle?: string;
  // 이 화면의 선택 이름. 없으면 선택 단추를 두지 않는다.
  scope?: string;
  canSelect?: boolean;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  const ui = useUi();
  const selecting = scope !== undefined && ui.selection?.scope === scope;

  if (selecting) {
    const count = ui.selection!.ids.length;
    return (
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/95 px-4">
        <button type="button" className="h-10 text-[15px] font-semibold text-accent" onClick={ui.endSelection}>
          취소
        </button>
        <span className="num text-[15px] font-bold">{count > 0 ? `${count}장 선택됨` : "항목 선택"}</span>
        <span className="w-8" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 bg-surface/95 px-4 pt-3 pb-2.5">
      {onBack && (
        <button type="button" aria-label="뒤로" className="-ml-2 grid size-9 place-items-center" onClick={onBack}>
          <Icon name="back" />
        </button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[30px] leading-[1.15] font-bold tracking-[-0.025em]">{title}</h1>
          {subtitle && <p className="num mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1 pb-0.5">
          {trailing}
          {scope !== undefined && canSelect && (
            <button
              type="button"
              className="h-8 rounded-work bg-sunken px-3 text-[14px] font-semibold"
              onClick={() => ui.startSelection(scope)}
            >
              선택
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
