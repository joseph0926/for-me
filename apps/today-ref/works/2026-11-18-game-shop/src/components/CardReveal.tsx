import { motion, useReducedMotion } from "motion/react";

import { rarityLabel, type Player, type Rarity } from "../data";
import { summarizeCards } from "../shop";

const frame: Record<Rarity, string> = {
  hero: "border-hero",
  rare: "border-rare",
  common: "border-common/60",
};

const rank: Record<Rarity, number> = { common: 0, rare: 1, hero: 2 };

// tastepin 게임 상점 팩 개봉 값: 낮은 등급부터 0.45초 간격으로 뒤집고, 가장 높은 영웅 카드는 0.7초 더 멈췄다가
// 뒤집으며 1.12배로 커진다. 카드 팩 개봉 값: 카드가 장마다 14도씩 부채꼴로 기운 채 나와 380ms에 한 줄로 선다.
// 장이 많은 팩은 전체 공개가 3초를 넘지 않게 간격을 줄인다.
const fanDegrees = 14;
const fanSeconds = 0.38;
const flipGap = 0.45;
const climaxPause = 0.7;

export function CardReveal({ title, cards, onDone }: { title: string; cards: Player[]; onDone: () => void }) {
  const reduce = useReducedMotion();
  const sorted = [...cards].sort((a, b) => rank[a.rarity] - rank[b.rarity] || a.rating - b.rating);
  const climax = sorted.length > 0 && sorted[sorted.length - 1].rarity === "hero" ? sorted.length - 1 : -1;
  const gap = Math.min(flipGap, 3 / Math.max(1, sorted.length));
  const middle = (sorted.length - 1) / 2;

  return (
    <div className="p-5 sm:p-6">
      <div className="text-center">
        <p className="text-[12px] font-semibold text-muted">{title}</p>
        <h2 className="mt-1 text-xl font-bold">{summarizeCards(cards)}</h2>
      </div>
      <ul className="mt-4 flex max-h-[60vh] flex-wrap justify-center gap-3 overflow-y-auto p-3">
        {sorted.map((card, index) => {
          const flipAt = fanSeconds + index * gap + (index === climax ? climaxPause : 0);
          const tilt = Math.max(-42, Math.min(42, (index - middle) * fanDegrees));
          return (
            <motion.li
              key={index}
              className="relative aspect-[3/4] w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3.75rem)/6)]"
              style={{ perspective: 600 }}
              initial={reduce ? false : { opacity: 0, rotate: tilt, y: 40 }}
              animate={{ opacity: 1, rotate: 0, y: 0, scale: index === climax ? 1.12 : 1 }}
              transition={{
                duration: fanSeconds,
                ease: [0.215, 0.61, 0.355, 1],
                scale: { delay: reduce ? 0 : flipAt, duration: 0.22, ease: [0.215, 0.61, 0.355, 1] },
              }}
            >
              <motion.div
                className="relative size-full"
                style={{ transformStyle: "preserve-3d" }}
                initial={reduce ? false : { rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ delay: flipAt, duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
              >
                <CardFace card={card} />
                <CardBack tease={index === climax} />
              </motion.div>
            </motion.li>
          );
        })}
      </ul>
      <div className="mt-5 flex justify-center">
        <button type="button" autoFocus onClick={onDone} className="btn btn-primary min-w-32">
          확인
        </button>
      </div>
    </div>
  );
}

// 선수 사진 없이 능력치, 포지션, 이름과 등급만 둔다. 생성한 실사 얼굴은 실존 인물처럼 보여 쓰지 않는다.
function CardFace({ card }: { card: Player }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between rounded-md border-2 bg-panel-raised p-2.5 [backface-visibility:hidden] ${frame[card.rarity]}`}
    >
      <div className="leading-none">
        <span className="block text-[28px] font-bold tabular">{card.rating}</span>
        <span className="mt-1 block text-[12px] font-semibold text-muted">{card.position}</span>
      </div>
      <div>
        <span className="block truncate text-[13px] font-bold">{card.name}</span>
        <span className="text-[11px] font-semibold text-muted">{rarityLabel[card.rarity]}</span>
      </div>
    </div>
  );
}

// 뒷면. 가장 높은 영웅 카드는 뒤집히기 전에 영웅 색 테두리가 2px에서 5px까지 1.2초 주기로 커졌다 돌아온다.
function CardBack({ tease }: { tease: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 grid place-items-center rounded-md bg-panel [backface-visibility:hidden] [transform:rotateY(180deg)]"
      initial={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
      animate={
        tease
          ? { boxShadow: ["inset 0 0 0 2px var(--hero)", "inset 0 0 0 5px var(--hero)", "inset 0 0 0 2px var(--hero)"] }
          : { boxShadow: "inset 0 0 0 1px var(--line)" }
      }
      transition={tease ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <span className="text-[13px] font-black tracking-[-.06em] text-muted italic">K27</span>
    </motion.div>
  );
}
