// 지갑, 구매 한도, 시즌 패스, 무료 보상 칸을 한곳에서 바꾼다.
// 무작위 카드 뽑기는 이벤트 핸들러에서 하고, 리듀서는 결과만 받아 순수하게 유지한다.
import {
  freeSlotRefillSeconds,
  freeSlotSeeds,
  initialWallet,
  passTiers,
  playerPool,
  type CurrencyId,
  type Pack,
  type PassTier,
  type Player,
  type PointBundle,
  type Rarity,
  type Wallet,
} from "./data";

export type FreeSlot = { kind: "timer"; readyAt: number } | { kind: "locked"; unlockLevel: number };

export type HistoryCost = { kind: "currency"; currency: CurrencyId; amount: number } | { kind: "won"; amount: number } | { kind: "free" };

export interface HistoryEntry {
  id: number;
  at: number;
  title: string;
  cost: HistoryCost;
  detail: string;
}

export interface ShopState {
  wallet: Wallet;
  bought: Record<string, number>;
  passTier: PassTier;
  favorites: string[];
  freeSlots: FreeSlot[];
  history: HistoryEntry[];
}

export type ShopAction =
  | { type: "buyPack"; pack: Pack; currency: CurrencyId; cards: Player[]; at: number }
  | { type: "claimFree"; slot: number; cards: Player[]; at: number }
  | { type: "buyPoints"; bundle: PointBundle; at: number }
  | { type: "buyPass"; tier: PassTier; at: number }
  | { type: "toggleFavorite"; packId: string };

export function createInitialState(now: number): ShopState {
  return {
    wallet: { ...initialWallet },
    bought: {},
    passTier: "free",
    favorites: ["gold"],
    freeSlots: freeSlotSeeds.map((seed) =>
      seed.kind === "timer" ? { kind: "timer", readyAt: now + seed.seconds * 1000 } : seed,
    ),
    history: [],
  };
}

const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, hero: 2 };

export function summarizeCards(cards: Player[]): string {
  const counts = { hero: 0, rare: 0, common: 0 };
  for (const card of cards) counts[card.rarity] += 1;
  const parts = [
    counts.hero > 0 ? `영웅 ${counts.hero}` : null,
    counts.rare > 0 ? `희귀 ${counts.rare}` : null,
    counts.common > 0 ? `일반 ${counts.common}` : null,
  ];
  return parts.filter(Boolean).join(", ");
}

export function remainingPurchases(pack: Pack, bought: Record<string, number>): number | null {
  if (pack.limit === undefined) return null;
  return Math.max(0, pack.limit - (bought[pack.id] ?? 0));
}

export function passUpgradeCost(current: PassTier, target: PassTier): number | null {
  const currentIndex = passTiers.findIndex((tier) => tier.id === current);
  const targetIndex = passTiers.findIndex((tier) => tier.id === target);
  if (targetIndex <= currentIndex) return null;
  return passTiers[targetIndex].price - passTiers[currentIndex].price;
}

export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  switch (action.type) {
    case "buyPack": {
      const price = action.pack.price[action.currency];
      if (price === undefined || state.wallet[action.currency] < price) return state;
      if (remainingPurchases(action.pack, state.bought) === 0) return state;
      return {
        ...state,
        wallet: { ...state.wallet, [action.currency]: state.wallet[action.currency] - price },
        bought: { ...state.bought, [action.pack.id]: (state.bought[action.pack.id] ?? 0) + 1 },
        history: [
          entry(state, action.at, action.pack.name, { kind: "currency", currency: action.currency, amount: price }, summarizeCards(action.cards)),
          ...state.history,
        ],
      };
    }
    case "claimFree": {
      const slot = state.freeSlots[action.slot];
      if (slot === undefined || slot.kind !== "timer" || slot.readyAt > action.at) return state;
      const freeSlots = state.freeSlots.map((current, index): FreeSlot =>
        index === action.slot ? { kind: "timer", readyAt: action.at + freeSlotRefillSeconds * 1000 } : current,
      );
      return {
        ...state,
        freeSlots,
        history: [entry(state, action.at, "무료 보상 팩", { kind: "free" }, summarizeCards(action.cards)), ...state.history],
      };
    }
    case "buyPoints": {
      const total = action.bundle.points + action.bundle.bonus;
      return {
        ...state,
        wallet: { ...state.wallet, point: state.wallet.point + total },
        history: [
          entry(state, action.at, `포인트 ${total.toLocaleString("ko-KR")}`, { kind: "won", amount: action.bundle.priceWon }, "포인트 충전"),
          ...state.history,
        ],
      };
    }
    case "buyPass": {
      const cost = passUpgradeCost(state.passTier, action.tier);
      if (cost === null || state.wallet.point < cost) return state;
      const tierName = passTiers.find((tier) => tier.id === action.tier)?.name ?? action.tier;
      return {
        ...state,
        passTier: action.tier,
        wallet: { ...state.wallet, point: state.wallet.point - cost },
        history: [
          entry(state, action.at, tierName, { kind: "currency", currency: "point", amount: cost }, state.passTier === "free" ? "시즌 패스 구매" : "등급 올리기"),
          ...state.history,
        ],
      };
    }
    case "toggleFavorite": {
      const favorites = state.favorites.includes(action.packId)
        ? state.favorites.filter((id) => id !== action.packId)
        : [...state.favorites, action.packId];
      return { ...state, favorites };
    }
  }
}

function entry(state: ShopState, at: number, title: string, cost: HistoryCost, detail: string): HistoryEntry {
  const lastId = state.history[0]?.id ?? 0;
  return { id: lastId + 1, at, title, cost, detail };
}

// 한 팩 안에서는 같은 등급의 선수가 다 나오기 전까지 같은 선수를 다시 뽑지 않는다.
export function drawCards(pack: Pack, count = pack.size, random: () => number = Math.random): Player[] {
  const drawn = new Set<string>();
  const cards = Array.from({ length: count }, () => pickPlayer(pickRarity(pack, random), random, drawn));
  const guaranteed = pack.guaranteed;
  if (guaranteed !== undefined && !cards.some((card) => rarityRank[card.rarity] >= rarityRank[guaranteed])) {
    const index = Math.floor(random() * cards.length);
    drawn.delete(cards[index].name);
    cards[index] = pickPlayer(guaranteed, random, drawn);
  }
  return cards;
}

function pickRarity(pack: Pack, random: () => number): Rarity {
  const roll = random() * 100;
  if (roll < pack.odds.hero) return "hero";
  if (roll < pack.odds.hero + pack.odds.rare) return "rare";
  return "common";
}

function pickPlayer(rarity: Rarity, random: () => number, drawn: Set<string>): Player {
  const sameRarity = playerPool.filter((player) => player.rarity === rarity);
  const fresh = sameRarity.filter((player) => !drawn.has(player.name));
  const candidates = fresh.length > 0 ? fresh : sameRarity;
  const player = candidates[Math.floor(random() * candidates.length)];
  drawn.add(player.name);
  return player;
}
