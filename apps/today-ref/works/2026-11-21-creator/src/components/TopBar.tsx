import type { ReactNode } from "react";

import { useApp } from "../context";
import { BackIcon } from "./Icons";

export function TopBar({ title, trailing }: { title?: ReactNode; trailing?: ReactNode }) {
  const { back } = useApp();
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-surface px-1.5">
      <button type="button" onClick={back} aria-label="뒤로" className="grid size-10 place-items-center rounded-full">
        <BackIcon />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">{title}</h1>
      <div className="flex min-w-10 justify-end">{trailing}</div>
    </header>
  );
}
