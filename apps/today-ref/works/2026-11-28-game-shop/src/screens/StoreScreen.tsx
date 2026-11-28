import { FeaturedBanner } from "./FeaturedBanner";
import { DailyShelf } from "./DailyShelf";
import { PackSection } from "./PackSection";
import type { DetailTarget } from "./ItemDetail";
import type { Purchase } from "../shop";

// 상점: 피처드 묶음(r2), 오늘의 상품(r1), 선수 팩(r3)을 위에서 아래로 쌓는다.
export function StoreScreen({ onOpen, onBuy }: { onOpen: (target: DetailTarget) => void; onBuy: (purchase: Purchase) => void }) {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-12 px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
      <FeaturedBanner onOpen={onOpen} onBuy={onBuy} />
      <DailyShelf onOpen={onOpen} />
      <PackSection onBuy={onBuy} />
    </div>
  );
}
