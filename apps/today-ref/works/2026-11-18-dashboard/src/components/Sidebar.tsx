import { AnimatePresence, motion } from "motion/react";

import { Icon } from "../icons";
import { CURVE } from "../motion";
import { NAV, type PageId } from "../pages";

interface SidebarProps {
  activeId: PageId;
  onNavigate: (id: PageId) => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}

// 넓은 화면에서는 고정 사이드바, 좁은 화면에서는 메뉴 버튼으로 여는 서랍이 된다.
export function Sidebar({ activeId, onNavigate, drawerOpen, onCloseDrawer }: SidebarProps) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 border-r border-line-soft bg-sidebar lg:block">
        <SidebarContent activeId={activeId} onNavigate={onNavigate} />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* 메뉴 패널은 스프링 없이 곡선으로 220ms에 들어오고 같은 길로 나간다(tastepin 드로어 예외와 메뉴 여는 방식 값).
                넓은 화면의 사이드바 자리를 이어 받으므로 오른쪽이 아니라 왼쪽에서 연다. */}
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={CURVE}
              onClick={onCloseDrawer}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[76%] max-w-[300px] border-r border-line bg-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={CURVE}
            >
              <SidebarContent activeId={activeId} onNavigate={onNavigate} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({ activeId, onNavigate }: Pick<SidebarProps, "activeId" | "onNavigate">) {
  return (
    <nav className="flex h-full flex-col px-2.5 py-3" aria-label="주 메뉴">
      <div className="flex items-center gap-2 px-2.5 pb-4 pt-0.5">
        <span className="grid size-[20px] shrink-0 place-items-center rounded-[5px] bg-[#2a2620] text-[11px] font-semibold text-accent">
          소
        </span>
        <span className="truncate text-[13px] font-medium text-ink">소담책방</span>
      </div>

      <div className="flex flex-col gap-4">
        {NAV.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label && <div className="px-2.5 pb-1 text-[12px] text-faint">{group.label}</div>}
            <ul className="flex flex-col gap-px">
              {group.pages.map((page) => {
                const active = page.id === activeId;
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(page.id)}
                      aria-current={active ? "page" : undefined}
                      className={`
                        flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[14px]
                        ${active ? "bg-raised text-ink" : "text-ink-2 hover:text-ink"}
                      `}
                    >
                      <Icon name={page.icon} className={`size-[15px] shrink-0 ${active ? "text-ink" : "text-muted"}`} />
                      <span className="truncate">{page.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
