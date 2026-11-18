import type { ComponentType } from "react";

import type { TabId } from "../navigation";
import { HeartIcon, HomeIcon, PersonIcon, PlusIcon, SearchIcon } from "./Icons";

type TabIconProps = { size?: number; filled?: boolean; strokeWidth?: number };

const tabs: { id: TabId; label: string; Icon: ComponentType<TabIconProps>; fillsWhenActive: boolean }[] = [
  { id: "home", label: "홈", Icon: HomeIcon, fillsWhenActive: true },
  { id: "search", label: "검색", Icon: SearchIcon, fillsWhenActive: false },
  { id: "activity", label: "활동", Icon: HeartIcon, fillsWhenActive: true },
  { id: "profile", label: "프로필", Icon: PersonIcon, fillsWhenActive: true },
];

export function TabBar({
  activeTab,
  onSelect,
  onCompose,
}: {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  onCompose: () => void;
}) {
  const renderTab = ({ id, label, Icon, fillsWhenActive }: (typeof tabs)[number]) => {
    const isActive = id === activeTab;
    return (
      <button
        key={id}
        type="button"
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelect(id)}
        className={`grid h-full flex-1 place-items-center transition-colors ${isActive ? "text-ink" : "text-faint"}`}
      >
        <Icon size={27} filled={isActive && fillsWhenActive} strokeWidth={isActive && !fillsWhenActive ? 2.6 : 2} />
      </button>
    );
  };

  return (
    <nav className="shrink-0 bg-surface pb-[var(--safe-bottom)]" aria-label="주요 화면">
      <div className="flex h-[54px] items-center px-2">
        {tabs.slice(0, 2).map(renderTab)}
        <div className="grid h-full flex-1 place-items-center">
          <button
            type="button"
            aria-label="글쓰기"
            onClick={onCompose}
            className="grid h-[42px] w-[58px] place-items-center rounded-[11px] bg-fill text-faint active:opacity-60"
          >
            <PlusIcon size={24} strokeWidth={2.2} />
          </button>
        </div>
        {tabs.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
