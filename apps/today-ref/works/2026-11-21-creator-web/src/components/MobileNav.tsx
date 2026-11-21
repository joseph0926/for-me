import { useApp } from "../context";
import { NAV_ITEMS, type NavId } from "./Sidebar";

// 768px보다 좁은 화면에서 왼쪽 메뉴 대신 쓰는 위아래 막대
export function MobileTopBar() {
  const { go } = useApp();
  return (
    <header className="sticky top-0 z-20 flex h-13 items-center border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
      <button type="button" onClick={() => go({ name: "home" })} className="text-[21px] font-extrabold tracking-[-0.04em]">
        소곤
      </button>
    </header>
  );
}

export function MobileTabBar({ active, unread }: { active: NavId | null; unread: number }) {
  const { go } = useApp();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => go({ name: id })}
          aria-current={active === id ? "page" : undefined}
          className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium ${active === id ? "text-ink" : "text-muted"}`}
        >
          <Icon size={22} />
          {label}
          {id === "alerts" && unread > 0 && (
            <span className="absolute left-1/2 top-1 ml-1.5 min-w-4 rounded-full bg-live px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
