// 왼쪽 보관함과 폴더 목록. 줄마다 오른쪽 끝에 지금 들어 있는 개수를 붙인다(r3).
import type { ReactNode } from "react";

import { folders, itemsInPlace, samePlace, type MediaItem, type Place } from "../library";
import { ClockIcon, FolderIcon, HeartIcon, ImportIcon, LibraryIcon, TrashIcon } from "./Icons";

interface SidebarProps {
  items: MediaItem[];
  place: Place;
  onPlace: (place: Place) => void;
  onImport: () => void;
}

export function Sidebar({ items, place, onPlace, onImport }: SidebarProps) {
  const count = (target: Place) => itemsInPlace(items, target).length;
  const row = (target: Place, icon: ReactNode, label: string) => {
    const active = samePlace(place, target);
    return (
      <button
        key={label}
        type="button"
        onClick={() => onPlace(target)}
        aria-current={active ? "page" : undefined}
        // 지금 보는 곳은 면과 굵기로, 올린 줄은 글자색만 바꾼다. 둘 다 면을 깔면 라이트에서 --hover와 --accent-soft가
        // 거의 같은 회색이라 마우스를 올린 줄이 고른 줄처럼 보였다.
        className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors ${
          active ? "bg-[var(--accent-soft)] font-[650] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
      >
        <span className={active ? "text-[var(--accent)]" : ""}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-[13px] tabular-nums text-[var(--faint)]">{count(target).toLocaleString()}</span>
      </button>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-2.5 pt-3 pb-3 thin-scroll" aria-label="보관함">
      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-1 text-[13px] font-[650] text-[var(--faint)]">보관함</p>
        {row({ type: "all" }, <LibraryIcon size={17} />, "모든 항목")}
        {row({ type: "favorites" }, <HeartIcon size={17} />, "즐겨찾기")}
        {row({ type: "recent" }, <ClockIcon size={17} />, "최근 추가")}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-1 text-[13px] font-[650] text-[var(--faint)]">폴더</p>
        {folders
          .filter((name) => name !== "가져온 항목" || items.some((item) => item.folder === name))
          .map((name) => row({ type: "folder", name }, <FolderIcon size={17} />, name))}
      </div>
      {/* 휴지통은 보관함 묶음에서 빼 목록 맨 아래에 둔다(tastepin 지운 뒤 보관: 옆 목록 맨 아래). */}
      <div className="mt-auto flex flex-col gap-2">
        {row({ type: "trash" }, <TrashIcon size={17} />, "휴지통")}
        <button
          type="button"
          onClick={onImport}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--hover)]"
        >
          <ImportIcon size={17} />
          가져오기
        </button>
      </div>
    </nav>
  );
}
