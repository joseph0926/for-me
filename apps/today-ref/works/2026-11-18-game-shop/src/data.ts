// 가상의 축구 게임 "KICKLINE 27" 상점의 가짜 데이터. 서버 없이 이 값으로 시작한다.

export type CurrencyId = "coin" | "point";
export type Wallet = Record<CurrencyId, number>;

// 코인은 경기로 벌고, 포인트는 돈으로 충전한다. 코인은 충전할 수 없다.
export const currencyLabel: Record<CurrencyId, string> = { coin: "코인", point: "포인트" };

// 받침에 따라 조사가 달라서 문장에 넣을 형태를 따로 둔다.
export const currencyWith: Record<CurrencyId, { subject: string; means: string }> = {
  coin: { subject: "코인이", means: "코인으로" },
  point: { subject: "포인트가", means: "포인트로" },
};

export const initialWallet: Wallet = { coin: 48_250, point: 1_250 };

export type Rarity = "common" | "rare" | "hero";

export const rarityLabel: Record<Rarity, string> = { common: "일반", rare: "희귀", hero: "영웅" };

export interface Player {
  portrait: string;
  name: string;
  position: string;
  rating: number;
  rarity: Rarity;
}

export const playerPool: Player[] = [
  { portrait: "han-doyun", name: "한도윤", position: "ST", rating: 89, rarity: "hero" },
  { portrait: "okafor", name: "R. 오카포", position: "CB", rating: 88, rarity: "hero" },
  { portrait: "pereira", name: "L. 페레이라", position: "CAM", rating: 90, rarity: "hero" },
  { portrait: "kurz", name: "M. 쿠르츠", position: "GK", rating: 87, rarity: "hero" },
  { portrait: "nakamura", name: "S. 나카무라", position: "RW", rating: 83, rarity: "rare" },
  { portrait: "baldwin", name: "J. 볼드윈", position: "CM", rating: 81, rarity: "rare" },
  { portrait: "esposito", name: "T. 에스포지토", position: "LB", rating: 80, rarity: "rare" },
  { portrait: "silva", name: "A. 실바", position: "ST", rating: 82, rarity: "rare" },
  { portrait: "verheij", name: "K. 베르헤이", position: "CDM", rating: 79, rarity: "rare" },
  { portrait: "lee-seojun", name: "이서준", position: "LW", rating: 78, rarity: "rare" },
  { portrait: "nowak", name: "P. 노바크", position: "CB", rating: 77, rarity: "rare" },
  { portrait: "marcel", name: "D. 마르셀", position: "RB", rating: 74, rarity: "common" },
  { portrait: "park-jihoon", name: "박지훈", position: "CM", rating: 72, rarity: "common" },
  { portrait: "ortega", name: "F. 오르테가", position: "ST", rating: 73, rarity: "common" },
  { portrait: "hartmann", name: "G. 하르트만", position: "GK", rating: 71, rarity: "common" },
  { portrait: "adeyemi", name: "N. 아데예미", position: "LM", rating: 70, rarity: "common" },
  { portrait: "rossi", name: "C. 로시", position: "CB", rating: 72, rarity: "common" },
  { portrait: "choi-minjae", name: "최민재", position: "RW", rating: 69, rarity: "common" },
  { portrait: "cooper", name: "B. 쿠퍼", position: "CAM", rating: 71, rarity: "common" },
  { portrait: "ivanov", name: "V. 이바노프", position: "LB", rating: 68, rarity: "common" },
  { portrait: "jung-woosung", name: "정우성", position: "CDM", rating: 70, rarity: "common" },
  { portrait: "martinez", name: "E. 마르티네스", position: "RM", rating: 69, rarity: "common" },
  { portrait: "johansson", name: "H. 요한손", position: "CB", rating: 71, rarity: "common" },
  { portrait: "diallo", name: "O. 디알로", position: "ST", rating: 72, rarity: "common" },
  { portrait: "fischer", name: "W. 피셔", position: "CM", rating: 68, rarity: "common" },
];

export interface Pack {
  id: string;
  name: string;
  description: string;
  size: number;
  // 카드 한 장마다 적용하는 확률(%). 나머지는 일반이다.
  odds: { rare: number; hero: number };
  // 팩 하나에 적어도 이 등급 하나가 들어간다.
  guaranteed?: Rarity;
  price: Partial<Wallet>;
  // 계정당 구매 한도. 없으면 반복 구매할 수 있다.
  limit?: number;
  endsLabel?: string;
  limited: boolean;
}

export const packs: Pack[] = [
  {
    id: "hero-pick",
    name: "영웅 선택 팩",
    description: "영웅 선수 1명이 반드시 들어 있는 시즌 한정 팩입니다.",
    size: 3,
    odds: { rare: 60, hero: 10 },
    guaranteed: "hero",
    price: { point: 2_500 },
    limit: 1,
    endsLabel: "3일 4시간 남음",
    limited: true,
  },
  {
    id: "gold",
    name: "골드 선수 팩",
    description: "선수 12명 중 희귀 이상 1명을 보장합니다.",
    size: 12,
    odds: { rare: 12, hero: 1.5 },
    guaranteed: "rare",
    price: { coin: 25_000, point: 300 },
    limited: false,
  },
  {
    id: "basic",
    name: "기본 선수 팩",
    description: "선수 5명이 들어 있는 기본 팩입니다.",
    size: 5,
    odds: { rare: 6, hero: 0.5 },
    price: { coin: 7_500, point: 100 },
    limited: false,
  },
  {
    id: "rare-trio",
    name: "희귀 3인 팩",
    description: "선수 3명이 모두 희귀 이상입니다.",
    size: 3,
    odds: { rare: 92, hero: 8 },
    guaranteed: "rare",
    price: { point: 750 },
    limit: 3,
    limited: false,
  },
  {
    id: "season-start",
    name: "시즌 시작 묶음",
    description: "희귀 선수 5명과 일반 선수 10명. 새 시즌에 한 번만 살 수 있습니다.",
    size: 15,
    odds: { rare: 20, hero: 2 },
    guaranteed: "rare",
    price: { point: 1_500 },
    limit: 1,
    endsLabel: "23일 남음",
    limited: true,
  },
  {
    id: "weekend",
    name: "주말 리그 팩",
    description: "주말 리그 참가자에게 열리는 코인 전용 팩입니다.",
    size: 8,
    odds: { rare: 10, hero: 1 },
    price: { coin: 18_000 },
    limit: 2,
    endsLabel: "1일 9시간 남음",
    limited: true,
  },
];

// 무료 보상 칸에서 여는 팩. 상점 목록에는 나오지 않는다.
export const freePack: Pack = {
  id: "free",
  name: "무료 보상 팩",
  description: "시간마다 쌓이는 무료 보상입니다.",
  size: 3,
  odds: { rare: 5, hero: 0 },
  price: {},
  limited: false,
};

export interface PointBundle {
  id: string;
  points: number;
  bonus: number;
  priceWon: number;
  badge?: string;
}

export const pointBundles: PointBundle[] = [
  { id: "p100", points: 100, bonus: 0, priceWon: 1_200 },
  { id: "p500", points: 500, bonus: 0, priceWon: 5_900 },
  { id: "p1000", points: 1_000, bonus: 50, priceWon: 11_000 },
  { id: "p2000", points: 2_000, bonus: 200, priceWon: 22_000, badge: "인기" },
  { id: "p5000", points: 5_000, bonus: 900, priceWon: 55_000, badge: "보너스 18%" },
  { id: "p10000", points: 10_000, bonus: 2_000, priceWon: 110_000, badge: "최고 효율" },
];

export type PassTier = "free" | "pass" | "plus";

export const passTiers: { id: PassTier; name: string; price: number }[] = [
  { id: "free", name: "무료", price: 0 },
  { id: "pass", name: "시즌 패스", price: 950 },
  { id: "plus", name: "패스 플러스", price: 2_400 },
];

// 패스를 사거나 올리면 바로 여는 보상 팩. 비교표의 "구매 즉시 받는 보상" 칸도 이 값에서 만든다.
export const passRewards: Record<Exclude<PassTier, "free">, { packId: string; count: number }> = {
  pass: { packId: "basic", count: 2 },
  plus: { packId: "gold", count: 2 },
};

export function passRewardLabel(tier: Exclude<PassTier, "free">): string {
  const reward = passRewards[tier];
  const pack = packs.find((entry) => entry.id === reward.packId);
  return `${pack?.name ?? reward.packId} ${reward.count}개`;
}

// 표의 칸은 포함(true), 없음(false), 또는 등급마다 다른 값(문자열)이다.
export const passBenefits: { label: string; values: Record<PassTier, boolean | string> }[] = [
  { label: "무료 보상 줄", values: { free: true, pass: true, plus: true } },
  { label: "패스 보상 줄 (40단계)", values: { free: false, pass: true, plus: true } },
  { label: "구매 즉시 받는 보상", values: { free: false, pass: passRewardLabel("pass"), plus: passRewardLabel("plus") } },
  { label: "경기 경험치 보너스", values: { free: false, pass: "+10%", plus: "+20%" } },
  { label: "단계 건너뛰기", values: { free: false, pass: false, plus: "20단계" } },
  { label: "시즌 전용 유니폼", values: { free: false, pass: false, plus: true } },
];

export const season = { name: "시즌 3", endsLabel: "23일 남음", level: 7, maxLevel: 40 };

// 무료 보상 칸의 처음 상태. 열릴 때까지 남은 초, 또는 잠김.
export type FreeSlotSeed = { kind: "timer"; seconds: number } | { kind: "locked"; unlockLevel: number };

export const freeSlotSeeds: FreeSlotSeed[] = [
  { kind: "timer", seconds: 0 },
  { kind: "timer", seconds: 15 },
  { kind: "timer", seconds: 3 * 3600 + 12 * 60 },
  { kind: "locked", unlockLevel: 10 },
];

// 무료 보상을 연 뒤 다시 쌓일 때까지의 시간.
export const freeSlotRefillSeconds = 4 * 3600;

