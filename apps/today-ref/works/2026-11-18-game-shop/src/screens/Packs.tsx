import { PackCard } from "../components/PackCard";
import { packs, type CurrencyId, type Pack } from "../data";
import type { ShopState } from "../shop";

// 팩이 여섯 개뿐이라 거르는 도구 없이 한 목록으로 보여 준다.
export function Packs({ state, onBuy }: { state: ShopState; onBuy: (pack: Pack, currency: CurrencyId) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} bought={state.bought} wallet={state.wallet} onBuy={(currency) => onBuy(pack, currency)} />
      ))}
    </div>
  );
}
