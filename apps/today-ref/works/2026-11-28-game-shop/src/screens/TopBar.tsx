// 게임 메뉴 머리줄(r1): 고른 탭만 밝은 면으로 띄우고 오른쪽 위에 두 재화를 늘 보여 준다.
import { useShop, Price } from "../ui";

export type Tab = "home" | "club" | "store";

const tabLabels: Record<Tab, string> = { home: "홈", club: "클럽", store: "상점" };

export function TopBar({ tab, onTab, onCharge }: { tab: Tab; onTab: (tab: Tab) => void; onCharge: () => void }) {
  const { state } = useShop();
  const unseen = state.seen ? 0 : state.recent.length;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-8">
        <div className="hidden font-title text-[22px] sm:block">하프라인 27</div>
        <nav aria-label="게임 메뉴" className="flex items-center gap-1 sm:mx-auto">
          {(Object.keys(tabLabels) as Tab[]).map((name) => {
            const selected = name === tab;
            return (
              <button
                key={name}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onTab(name)}
                className={`relative h-9 rounded-work px-3 text-[15px] font-extrabold transition-colors duration-150 sm:px-4 ${
                  selected ? "bg-ink text-surface" : "text-muted hover:text-ink"
                }`}
              >
                {tabLabels[name]}
                {name === "club" && unseen > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-work bg-accent px-1 text-[11px] text-accent-ink tabular">
                    <span className="sr-only">새로 받은 것 </span>
                    {unseen}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[14px] sm:ml-0 sm:gap-5 sm:text-[15px]">
          <Price currency="coins" amount={state.balance.coins} />
          <span className="flex items-center gap-1">
            <Price currency="points" amount={state.balance.points} />
            {/* 충전할 수 있는 재화는 포인트뿐이라 그 옆에만 충전 버튼을 둔다(tastepin 게임 상점 보유 재화 값). */}
            <button
              type="button"
              onClick={onCharge}
              aria-label="포인트 충전"
              className="grid size-8 place-items-center rounded-work text-[18px] font-bold text-muted hover:bg-raised hover:text-ink"
            >
              +
            </button>
          </span>
        </div>
      </div>
    </header>
  );
}
