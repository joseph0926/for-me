import { Icon, type IconName } from "./Icon";

export type Tab = "home" | "library";

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: "home", label: "홈", icon: "home" },
  { id: "library", label: "보관함", icon: "library" },
];

export function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const selected = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              selected ? "text-ink" : "text-faint"
            }`}
          >
            <Icon name={tab.icon} size={22} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
