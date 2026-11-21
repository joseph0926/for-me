import type { ComponentType } from "react";

import type { TabId } from "../navigation";
import { BellIcon, CompassIcon, HomeIcon, UserIcon } from "./Icons";

const tabs: { id: TabId; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "explore", label: "탐색", Icon: CompassIcon },
  { id: "alerts", label: "알림", Icon: BellIcon },
  { id: "me", label: "나", Icon: UserIcon },
];

export function TabBar({ active, unread, onSelect }: { active: TabId; unread: number; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium ${
              isActive ? "text-ink" : "text-muted"
            }`}
          >
            <Icon size={23} />
            {label}
            {id === "alerts" && unread > 0 && (
              <span className="absolute left-1/2 top-1 ml-1.5 min-w-4 rounded-full bg-live px-1 text-[10px] font-bold leading-4 text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
