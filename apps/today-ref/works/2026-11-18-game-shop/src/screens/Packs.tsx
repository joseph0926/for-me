import { useState } from "react";

import { PackCard } from "../components/PackCard";
import { packs, type CurrencyId, type Pack } from "../data";
import type { ShopState } from "../shop";

const filters = [
  { id: "all", label: "전체", match: () => true },
  { id: "limited", label: "한정", match: (pack: Pack) => pack.limited },
  { id: "coin", label: "코인으로 사기", match: (pack: Pack) => pack.price.coin !== undefined },
  { id: "favorite", label: "즐겨찾기", match: (pack: Pack, favorites: string[]) => favorites.includes(pack.id) },
] as const;

type FilterId = (typeof filters)[number]["id"];

export function Packs({
  state,
  onBuy,
  onToggleFavorite,
}: {
  state: ShopState;
  onBuy: (pack: Pack, currency: CurrencyId) => void;
  onToggleFavorite: (packId: string) => void;
}) {
  const [filterId, setFilterId] = useState<FilterId>("all");
  const filter = filters.find((entry) => entry.id === filterId) ?? filters[0];
  const visible = packs.filter((pack) => filter.match(pack, state.favorites));

  return (
    <div>
      <div role="tablist" aria-label="팩 종류" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {filters.map((entry) => {
          const selected = entry.id === filterId;
          const count = packs.filter((pack) => entry.match(pack, state.favorites)).length;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilterId(entry.id)}
              className={`h-9 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition ${
                selected ? "border-ink bg-ink text-surface" : "border-line text-muted hover:text-ink"
              }`}
            >
              {entry.label} <span className="tabular opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
          팩 카드의 별을 누르면 여기에 모입니다.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              bought={state.bought}
              wallet={state.wallet}
              favorite={state.favorites.includes(pack.id)}
              onToggleFavorite={() => onToggleFavorite(pack.id)}
              onBuy={(currency) => onBuy(pack, currency)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
