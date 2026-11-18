import { motion } from "motion/react";

import { rarityLabel, type Player, type Rarity } from "../data";
import { summarizeCards } from "../shop";

const frame: Record<Rarity, string> = {
  hero: "border-hero bg-[linear-gradient(160deg,#ffb76b,#7a2a12)] shadow-[0_0_28px_rgb(255_159_67/0.55)]",
  rare: "border-rare bg-[linear-gradient(160deg,#5fd0ff,#0d3a5c)] shadow-[0_0_18px_rgb(73_198_255/0.35)]",
  common: "border-common/60 bg-[linear-gradient(160deg,#3a4255,#171b25)]",
};

// 높은 등급이 먼저 보이도록 정렬하고, 한 장씩 뒤집어 보여 준다.
export function CardReveal({ title, cards, onDone }: { title: string; cards: Player[]; onDone: () => void }) {
  const order: Record<Rarity, number> = { hero: 0, rare: 1, common: 2 };
  const sorted = [...cards].sort((a, b) => order[a.rarity] - order[b.rarity] || b.rating - a.rating);
  const stagger = Math.min(0.12, 1.6 / sorted.length);

  return (
    <div className="p-5 sm:p-6">
      <div className="text-center">
        <p className="text-[12px] font-semibold tracking-wide text-muted">{title}</p>
        <h2 className="mt-1 text-xl font-extrabold">{summarizeCards(cards)}</h2>
      </div>
      <ul className="mt-3 flex max-h-[55vh] flex-wrap justify-center gap-2 overflow-y-auto p-3 sm:gap-3">
        {sorted.map((card, index) => (
          <motion.li
            key={index}
            className={`flex aspect-[3/4] w-[calc((100%-1rem)/3)] flex-col justify-between rounded-xl border-2 p-2 text-white sm:w-[calc((100%-3.75rem)/6)] ${frame[card.rarity]}`}
            initial={{ rotateY: 90, opacity: 0, y: 10 }}
            animate={{ rotateY: 0, opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * stagger, duration: 0.35 }}
            style={{ transformPerspective: 600 }}
          >
            <div className="leading-none">
              <span className="block text-2xl font-black tabular">{card.rating}</span>
              <span className="text-[11px] font-bold opacity-80">{card.position}</span>
            </div>
            <div>
              <span className="block truncate text-[12px] font-bold">{card.name}</span>
              <span className="text-[10px] font-semibold opacity-75">{rarityLabel[card.rarity]}</span>
            </div>
          </motion.li>
        ))}
      </ul>
      <button
        type="button"
        autoFocus
        onClick={onDone}
        className="mt-5 h-12 w-full rounded-2xl bg-accent text-[15px] font-bold text-white transition hover:brightness-110"
      >
        확인
      </button>
    </div>
  );
}
