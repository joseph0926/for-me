// 상점의 메모리 상태와 구매 규칙. 새로고침하면 처음 상태로 돌아간다.
import {
  bundleSingleTotal,
  featuredBundle,
  getItem,
  getPack,
  players,
  playerTier,
  startingPlayerIds,
  type Currency,
  type Pack,
  type Player,
} from "./data";

export type Purchase =
  | { kind: "item"; itemId: string }
  | { kind: "bundle"; bundleId: string }
  | { kind: "pack"; packId: string; currency: Currency };

export interface Acquisition {
  key: string;
  kind: "item" | "player";
  id: string;
}

export interface ShopState {
  balance: Record<Currency, number>;
  ownedItemIds: string[];
  clubPlayerIds: string[];
  // 가장 최근에 받은 것이 앞에 온다. 홈과 클럽에서 "새"로 표시한다.
  recent: Acquisition[];
  // 미리보기 팩을 미리 보면 그 내용이 정해지고, 살 때 그대로 받는다.
  previews: Record<string, string[]>;
  seen: boolean;
}

export const initialState: ShopState = {
  balance: { coins: 48200, points: 320 },
  ownedItemIds: [],
  clubPlayerIds: startingPlayerIds,
  recent: [],
  previews: {},
  seen: true,
};

export type Action =
  | { type: "buy"; purchase: Purchase; packPlayerIds?: string[] }
  | { type: "charge"; points: number }
  | { type: "preview"; packId: string; playerIds: string[] }
  | { type: "markSeen" };

export interface Cost {
  currency: Currency;
  amount: number;
}

export function costOf(purchase: Purchase, state: ShopState): Cost {
  switch (purchase.kind) {
    case "item":
      return getItem(purchase.itemId).price;
    case "bundle":
      return { currency: "points", amount: bundlePrice(state) };
    case "pack": {
      const pack = getPack(purchase.packId);
      return { currency: purchase.currency, amount: purchase.currency === "coins" ? pack.coins : pack.points };
    }
  }
}

// 묶음 안의 상품을 이미 가졌으면 그만큼 뺀 값을 낸다. 모두 가졌으면 0이다.
export function bundlePrice(state: ShopState): number {
  const ownedValue = featuredBundle.itemIds
    .filter((id) => state.ownedItemIds.includes(id))
    .reduce((sum, id) => sum + getItem(id).price.amount, 0);
  const total = bundleSingleTotal(featuredBundle);
  return Math.max(0, Math.round((featuredBundle.price * (total - ownedValue)) / total / 10) * 10);
}

export function bundleOwned(state: ShopState): boolean {
  return featuredBundle.itemIds.every((id) => state.ownedItemIds.includes(id));
}

export function purchaseName(purchase: Purchase): string {
  switch (purchase.kind) {
    case "item":
      return getItem(purchase.itemId).name;
    case "bundle":
      return featuredBundle.name;
    case "pack":
      return getPack(purchase.packId).name;
  }
}

export function shopReducer(state: ShopState, action: Action): ShopState {
  switch (action.type) {
    case "charge":
      return { ...state, balance: { ...state.balance, points: state.balance.points + action.points } };
    case "preview":
      return { ...state, previews: { ...state.previews, [action.packId]: action.playerIds } };
    case "markSeen":
      return { ...state, seen: true };
    case "buy": {
      const cost = costOf(action.purchase, state);
      // 확인 창이 막지만, 잔액이 모자란 구매가 들어오면 상태를 바꾸지 않는다.
      if (state.balance[cost.currency] < cost.amount) return state;
      const balance = { ...state.balance, [cost.currency]: state.balance[cost.currency] - cost.amount };
      const gainedItems = itemsOf(action.purchase).filter((id) => !state.ownedItemIds.includes(id));
      const gainedPlayers = action.purchase.kind === "pack" ? (action.packPlayerIds ?? []) : [];
      const stamp = Date.now();
      const acquisitions: Acquisition[] = [
        ...gainedPlayers.map((id, index) => ({ key: `${stamp}-p${index}`, kind: "player" as const, id })),
        ...gainedItems.map((id, index) => ({ key: `${stamp}-i${index}`, kind: "item" as const, id })),
      ];
      const previews = { ...state.previews };
      if (action.purchase.kind === "pack") delete previews[action.purchase.packId];
      return {
        ...state,
        balance,
        ownedItemIds: [...state.ownedItemIds, ...gainedItems],
        clubPlayerIds: [...state.clubPlayerIds, ...gainedPlayers],
        recent: [...acquisitions, ...state.recent],
        previews,
        seen: false,
      };
    }
  }
}

function itemsOf(purchase: Purchase): string[] {
  if (purchase.kind === "item") return [purchase.itemId];
  if (purchase.kind === "bundle") return featuredBundle.itemIds;
  return [];
}

// 팩 뽑기. 확률 표의 "이 조건 이상이 한 명 이상"을 그대로 따른다.
// 먼저 가장 높은 한 명의 구간을 확률 표로 정하고, 나머지는 표의 가장 낮은 조건보다 낮은 선수에서 뽑는다.
// 한 팩 안에서 같은 선수는 다시 나오지 않는다.
export function drawPack(pack: Pack, random: () => number = Math.random): string[] {
  const tierPlayers = players.filter((player) => playerTier(player) === pack.tier);
  const thresholds = [...pack.odds].sort((a, b) => b.minRating - a.minRating);
  const lowest = thresholds[thresholds.length - 1].minRating;

  const roll = random();
  const hitIndex = thresholds.findIndex((odds) => roll < odds.chance);
  const picked: Player[] = [];
  if (hitIndex >= 0) {
    const floor = thresholds[hitIndex].minRating;
    const ceiling = hitIndex === 0 ? Infinity : thresholds[hitIndex - 1].minRating;
    picked.push(pickOne(tierPlayers.filter((player) => player.rating >= floor && player.rating < ceiling), random));
  }

  const below = tierPlayers.filter((player) => player.rating < lowest);
  const raresNeeded = Math.max(0, pack.rares - picked.filter((player) => player.rare).length);
  const fillCount = pack.count - picked.length;
  const rareFill = takeRandom(below.filter((player) => player.rare), Math.min(raresNeeded, fillCount), random);
  const plainFill = takeRandom(
    below.filter((player) => !player.rare),
    fillCount - rareFill.length,
    random,
  );
  return [...picked, ...rareFill, ...plainFill].map((player) => player.id);
}

function pickOne(pool: Player[], random: () => number): Player {
  if (pool.length === 0) throw new Error("뽑을 선수가 없습니다");
  return pool[Math.floor(random() * pool.length)];
}

function takeRandom(pool: Player[], count: number, random: () => number): Player[] {
  if (pool.length < count) throw new Error(`선수가 모자랍니다: ${pool.length} < ${count}`);
  const rest = [...pool];
  const result: Player[] = [];
  for (let n = 0; n < count; n += 1) {
    const index = Math.floor(random() * rest.length);
    result.push(rest[index]);
    rest.splice(index, 1);
  }
  return result;
}
