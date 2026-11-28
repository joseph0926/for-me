// 가상의 축구 게임 "하프라인 27"의 상점 데이터. 서버 없이 이 파일과 shop.ts의 메모리 상태만 쓴다.

export type Currency = "coins" | "points";

export const currencyName: Record<Currency, string> = { coins: "코인", points: "포인트" };

// 상품 카드의 그림. art.tsx가 종류마다 SVG로 그린다.
export type Art =
  | { kind: "kit"; pattern: "hoops" | "stripes" | "sash" | "halves" | "plain" | "chevron"; base: string; second: string; trim: string }
  | { kind: "ball"; base: string; panel: string }
  | { kind: "scarf"; base: string; second: string }
  | { kind: "banner"; base: string; second: string; text: string }
  | { kind: "armband"; base: string; mark: string }
  | { kind: "flag"; base: string; second: string };

// 상품 등급. 카드 색은 상품마다 칠하지 않고 이 세 단계에만 쓴다(r1 Fortnite의 카드 색도 등급을 뜻한다).
export type Rarity = "common" | "rare" | "epic";

export const rarityStyle: Record<Rarity, { name: string; ground: string; line: string }> = {
  common: { name: "일반", ground: "#24262b", line: "#8d939e" },
  rare: { name: "레어", ground: "#172743", line: "#5b9cf0" },
  epic: { name: "영웅", ground: "#3a2316", line: "#f0934f" },
};

export interface Item {
  id: string;
  name: string;
  art: Art;
  rarity: Rarity;
  price: { currency: Currency; amount: number };
}

export interface Bundle {
  id: string;
  name: string;
  itemIds: string[];
  price: number;
}

export const items: Item[] = [
  {
    id: "night-home",
    name: "야간 경기 홈 유니폼",
    art: { kind: "kit", pattern: "chevron", base: "#1b1f3b", second: "#8fd0ff", trim: "#ffffff" },
    rarity: "epic",
    price: { currency: "points", amount: 900 },
  },
  {
    id: "night-away",
    name: "야간 경기 원정 유니폼",
    art: { kind: "kit", pattern: "plain", base: "#eef3f8", second: "#1b1f3b", trim: "#8fd0ff" },
    rarity: "rare",
    price: { currency: "points", amount: 900 },
  },
  {
    id: "night-keeper",
    name: "야간 경기 골키퍼 유니폼",
    art: { kind: "kit", pattern: "halves", base: "#c6f24e", second: "#1b1f3b", trim: "#1b1f3b" },
    rarity: "rare",
    price: { currency: "points", amount: 700 },
  },
  {
    id: "night-ball",
    name: "야간 경기 공",
    art: { kind: "ball", base: "#f3f6fa", panel: "#1b1f3b" },
    rarity: "common",
    price: { currency: "points", amount: 450 },
  },
  {
    id: "night-banner",
    name: "야간 경기 걸개",
    art: { kind: "banner", base: "#1b1f3b", second: "#8fd0ff", text: "밤의 열두 번째" },
    rarity: "common",
    price: { currency: "points", amount: 600 },
  },
  {
    id: "harbour-kit",
    name: "항구 도시 유니폼",
    art: { kind: "kit", pattern: "hoops", base: "#0e5a8a", second: "#f4efe4", trim: "#0e2a40" },
    rarity: "rare",
    price: { currency: "points", amount: 900 },
  },
  {
    id: "red-stripe-kit",
    name: "붉은 줄무늬 유니폼",
    art: { kind: "kit", pattern: "stripes", base: "#c8323a", second: "#f6f1ea", trim: "#1c1c1c" },
    rarity: "rare",
    price: { currency: "points", amount: 900 },
  },
  {
    id: "first-snow-ball",
    name: "첫눈 공",
    art: { kind: "ball", base: "#ffffff", panel: "#5b8fd6" },
    rarity: "rare",
    price: { currency: "coins", amount: 12000 },
  },
  {
    id: "north-stand-scarf",
    name: "북쪽 관중석 머플러",
    art: { kind: "scarf", base: "#1f7a4d", second: "#f4efe4" },
    rarity: "common",
    price: { currency: "points", amount: 300 },
  },
  {
    id: "twelfth-banner",
    name: "열두 번째 선수 걸개",
    art: { kind: "banner", base: "#f4efe4", second: "#b8326e", text: "우리가 열두 번째" },
    rarity: "rare",
    price: { currency: "points", amount: 600 },
  },
  {
    id: "bolt-armband",
    name: "번개 주장 완장",
    art: { kind: "armband", base: "#ff8a3d", mark: "#1c1c1c" },
    rarity: "epic",
    price: { currency: "coins", amount: 8000 },
  },
  {
    id: "check-flag",
    name: "체크 코너 깃발",
    art: { kind: "flag", base: "#f4efe4", second: "#1f7a4d" },
    rarity: "common",
    price: { currency: "coins", amount: 6000 },
  },
];

export const itemById = new Map(items.map((item) => [item.id, item]));

export function getItem(id: string): Item {
  const item = itemById.get(id);
  if (!item) throw new Error(`없는 상품: ${id}`);
  return item;
}

export const featuredBundle: Bundle = {
  id: "night-collection",
  name: "야간 경기 컬렉션",
  itemIds: ["night-home", "night-away", "night-keeper", "night-ball", "night-banner"],
  price: 2400,
};

export function bundleSingleTotal(bundle: Bundle): number {
  return bundle.itemIds.reduce((sum, id) => sum + getItem(id).price.amount, 0);
}

// 오늘의 상품 진열 순서(r1). 큰 카드 하나 또는 작은 카드 두 장이 한 칸이다.
export type DailySlot = { size: "large"; itemId: string } | { size: "small"; itemIds: [string, string] };

export const dailySlots: DailySlot[] = [
  { size: "large", itemId: "harbour-kit" },
  { size: "large", itemId: "red-stripe-kit" },
  { size: "small", itemIds: ["first-snow-ball", "north-stand-scarf"] },
  { size: "large", itemId: "twelfth-banner" },
  { size: "small", itemIds: ["bolt-armband", "check-flag"] },
];

// 선수와 팩

export type Tier = "bronze" | "silver" | "gold";

export const tierName: Record<Tier, string> = { bronze: "브론즈", silver: "실버", gold: "골드" };

export interface Player {
  id: string;
  name: string;
  position: string;
  rating: number;
  nation: string;
  rare: boolean;
  // 속도, 슈팅, 패스, 드리블, 수비, 피지컬
  stats: [number, number, number, number, number, number];
}

export const statNames = ["속도", "슈팅", "패스", "드리블", "수비", "피지컬"] as const;

export function playerTier(player: Player): Tier {
  if (player.rating >= 75) return "gold";
  if (player.rating >= 65) return "silver";
  return "bronze";
}

// 모두 가상의 선수다. 팩 확률 표대로 뽑으려면 능력치 구간마다 선수가 넉넉해야 해서, 고정된 씨앗으로 목록을 만든다.
// 씨앗이 같으므로 새로고침해도 같은 선수와 id가 나온다.
const surnames = [
  "벨라스코", "오카포", "헤드룬드", "카르발류", "마르텔", "아다무", "노바크", "파스칼", "린드그렌", "무뇨스",
  "볼코프", "야마시타", "앙드레", "오니엘", "코스타", "하스", "라미레스", "브란트", "엘리스", "페트로프",
  "벤살라", "산체스", "퀸", "코발", "뒤부아", "하카라", "모라", "보스", "음벤가", "쿠르츠",
  "알메이다", "사보", "니엘센", "오르테가", "바르가스", "데루카", "소렌센", "오세이", "로하스", "이바라",
  "콜린스", "베르그", "마자리", "시모네", "호프만", "카스텔로", "앙헬", "드라고비치", "에스코바르", "키타무라",
];
const koreanNames = ["한서진", "오태윤", "이준호", "박도현", "정우석", "김하람", "윤재민", "서지후", "강민혁", "최유찬"];
const initials = "ABCDEFGHJKLMNOPRSTVY";
const nations = ["ESP", "NGA", "SWE", "POR", "FRA", "GHA", "CZE", "BEL", "NOR", "ARG", "UKR", "JPN", "BRA", "AUT", "MEX", "GER", "KOR"];
const positions = ["GK", "CB", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"] as const;

// 포지션마다 종합 능력치에서 각 능력치가 얼마나 벗어나는지(속도, 슈팅, 패스, 드리블, 수비, 피지컬).
const statShape: Record<(typeof positions)[number], Player["stats"]> = {
  GK: [-30, -60, -18, -40, -50, -6],
  CB: [-10, -35, -18, -20, 4, 5],
  LB: [6, -22, -6, -2, -2, -4],
  RB: [6, -22, -6, -2, -2, -4],
  CDM: [-8, -14, -2, -6, 2, 4],
  CM: [-6, -6, 4, 0, -10, -6],
  CAM: [-2, 0, 4, 5, -28, -16],
  LW: [8, -2, -4, 5, -42, -20],
  RW: [8, -2, -4, 5, -42, -20],
  ST: [2, 4, -12, -2, -44, -2],
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildPlayers(): Player[] {
  const random = seededRandom(27);
  const result: Player[] = [];
  // 능력치 구간별 선수 수. 높을수록 드물다.
  const ratingCounts: [rating: number, count: number][] = [];
  for (let rating = 89; rating >= 50; rating -= 1) {
    const count = rating >= 86 ? 1 : rating >= 82 ? 2 : rating >= 75 ? 4 : 3;
    ratingCounts.push([rating, count]);
  }
  let koreanIndex = 0;
  for (const [rating, count] of ratingCounts) {
    for (let n = 0; n < count; n += 1) {
      const index = result.length;
      const useKorean = index % 6 === 3 && koreanIndex < koreanNames.length;
      const name = useKorean
        ? koreanNames[koreanIndex++]
        : `${initials[Math.floor(random() * initials.length)]}. ${surnames[index % surnames.length]}`;
      const position = positions[Math.floor(random() * positions.length)];
      const stats = statShape[position].map((offset) =>
        Math.max(10, Math.min(99, rating + offset + Math.round((random() - 0.5) * 8))),
      ) as Player["stats"];
      result.push({
        id: `p${index + 1}`,
        name,
        position,
        rating,
        nation: useKorean ? "KOR" : nations[Math.floor(random() * nations.length)],
        rare: random() < 0.38,
        stats,
      });
    }
  }
  return result;
}

export const players: Player[] = buildPlayers();

export const playerById = new Map(players.map((player) => [player.id, player]));

export function getPlayer(id: string): Player {
  const player = playerById.get(id);
  if (!player) throw new Error(`없는 선수: ${id}`);
  return player;
}

// 팩마다 "이 등급 이상이 한 명 이상 나올 확률"을 높은 조건부터 적는다(r3의 팩 확률 보기).
// 화면에 보이는 이 표와 shop.ts의 뽑기가 같은 값을 쓴다.
export interface Odds {
  label: string;
  minRating: number;
  chance: number;
}

export interface Pack {
  id: string;
  name: string;
  tier: Tier;
  premium: boolean;
  preview: boolean;
  count: number;
  rares: number;
  coins: number;
  points: number;
  description: string;
  odds: Odds[];
}

export const packs: Pack[] = [
  {
    id: "bronze",
    name: "브론즈 팩",
    tier: "bronze",
    premium: false,
    preview: false,
    count: 5,
    rares: 1,
    coins: 750,
    points: 15,
    description: "브론즈 선수 5명, 그중 레어 1명.",
    odds: [{ label: "브론즈 60+", minRating: 60, chance: 0.35 }],
  },
  {
    id: "silver",
    name: "실버 팩",
    tier: "silver",
    premium: false,
    preview: false,
    count: 5,
    rares: 1,
    coins: 2500,
    points: 50,
    description: "실버 선수 5명, 그중 레어 1명.",
    odds: [
      { label: "실버 70+", minRating: 70, chance: 0.3 },
      { label: "실버 68+", minRating: 68, chance: 0.55 },
    ],
  },
  {
    id: "gold-preview",
    name: "골드 미리보기 팩",
    tier: "gold",
    premium: false,
    preview: true,
    count: 6,
    rares: 1,
    coins: 5000,
    points: 100,
    description: "골드 선수 6명, 그중 레어 1명. 사기 전에 든 선수를 미리 보고, 사면 미리 본 그대로 받습니다.",
    odds: [
      { label: "골드 84+", minRating: 84, chance: 0.045 },
      { label: "골드 82+", minRating: 82, chance: 0.2 },
    ],
  },
  {
    id: "gold",
    name: "골드 팩",
    tier: "gold",
    premium: false,
    preview: false,
    count: 6,
    rares: 1,
    coins: 5000,
    points: 100,
    description: "골드 선수 6명, 그중 레어 1명.",
    odds: [
      { label: "골드 84+", minRating: 84, chance: 0.045 },
      { label: "골드 82+", minRating: 82, chance: 0.2 },
    ],
  },
  {
    id: "premium-gold",
    name: "프리미엄 골드 팩",
    tier: "gold",
    premium: true,
    preview: false,
    count: 6,
    rares: 3,
    coins: 7500,
    points: 150,
    description: "골드 선수 6명, 그중 레어 3명.",
    odds: [
      { label: "골드 86+", minRating: 86, chance: 0.05 },
      { label: "골드 84+", minRating: 84, chance: 0.12 },
      { label: "골드 82+", minRating: 82, chance: 0.4 },
    ],
  },
];

export function getPack(id: string): Pack {
  const pack = packs.find((candidate) => candidate.id === id);
  if (!pack) throw new Error(`없는 팩: ${id}`);
  return pack;
}

// 포인트 충전 묶음. 결제는 흉내만 내고 바로 포인트를 더한다.
export interface PointOffer {
  id: string;
  points: number;
  bonusRate: number;
  won: number;
}

export const pointOffers: PointOffer[] = [
  { id: "p500", points: 500, bonusRate: 0, won: 5500 },
  { id: "p1050", points: 1050, bonusRate: 0.05, won: 11000 },
  { id: "p2800", points: 2800, bonusRate: 0.12, won: 27500 },
  { id: "p5750", points: 5750, bonusRate: 0.15, won: 55000 },
];

// 처음 클럽에 있는 선수: 능력치마다 첫 선수 한 명씩. 상점에서 받은 선수가 여기에 더해진다.
const startingRatings = [76, 74, 72, 71, 70, 68, 67, 65, 63, 61, 58];
export const startingPlayerIds = startingRatings.map((rating) => {
  const player = players.find((candidate) => candidate.rating === rating);
  if (!player) throw new Error(`능력치 ${rating} 선수가 없습니다`);
  return player.id;
});

// 접속한 시각부터 센 구역별 남은 시간(밀리초).
const hour = 60 * 60 * 1000;
export const sectionEndsIn = {
  featured: 2 * 24 * hour + 1 * hour + 32 * 60 * 1000 + 17 * 1000,
  daily: 14 * hour + 22 * 60 * 1000 + 5 * 1000,
} as const;
