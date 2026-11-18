import type { ReactNode } from "react";

export type Tab = "ledger" | "budget" | "analysis";

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "ledger",
    label: "가계부",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
  },
  {
    id: "budget",
    label: "예산",
    icon: (
      <>
        <path d="M5 8h14M5 13h14M5 18h14" />
        <path d="M5 8h9M5 13h5M5 18h12" strokeWidth="3.2" />
      </>
    ),
  },
  {
    id: "analysis",
    label: "분석",
    icon: <path d="M4 18l5-6 4 3 7-9" />,
  },
];

export function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="grid shrink-0 grid-cols-3 border-t border-[var(--line)] bg-[var(--surface)] pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${active ? "text-[var(--ink)]" : "text-[var(--faint)]"}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
