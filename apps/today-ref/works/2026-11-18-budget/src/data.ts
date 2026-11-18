// 서버 없이 쓰는 가짜 가계부 자료. 오늘은 2026-11-18로 고정하고, 지난달(10월)과 이번 달 오늘까지 내역을 만든다.
import { type DateKey, daysInMonth, toDateKey } from "./dates";

export const TODAY: DateKey = "2026-11-18";

export type EntryKind = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  kind: EntryKind;
  color: string;
}

export interface Entry {
  id: string;
  date: DateKey;
  kind: EntryKind;
  amount: number;
  categoryId: string;
  memo: string;
}

export const categories: Category[] = [
  { id: "food", name: "식비", kind: "expense", color: "#f08c3a" },
  { id: "cafe", name: "카페", kind: "expense", color: "#a9744f" },
  { id: "transit", name: "교통", kind: "expense", color: "#3d8bd9" },
  { id: "shopping", name: "쇼핑", kind: "expense", color: "#d6589a" },
  { id: "living", name: "생활", kind: "expense", color: "#3fa57a" },
  { id: "culture", name: "문화", kind: "expense", color: "#8a63d2" },
  { id: "housing", name: "주거 통신", kind: "expense", color: "#6b7280" },
  { id: "salary", name: "월급", kind: "income", color: "#2b6cde" },
  { id: "side", name: "부수입", kind: "income", color: "#18a0b5" },
];

export function findCategory(id: string): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`없는 분류: ${id}`);
  return category;
}

// 분류별 한 달 예산(원). fixed는 월세처럼 정해진 날 한 번에 나가는 돈이라 쓰는 속도를 따지지 않는다.
export const monthlyBudgets: { categoryId: string; limit: number; fixed?: boolean }[] = [
  { categoryId: "food", limit: 450_000 },
  { categoryId: "cafe", limit: 80_000 },
  { categoryId: "transit", limit: 100_000 },
  { categoryId: "shopping", limit: 200_000 },
  { categoryId: "living", limit: 120_000 },
  { categoryId: "culture", limit: 100_000 },
  { categoryId: "housing", limit: 650_000, fixed: true },
];

// 날마다 같은 결과가 나오도록 고정 씨앗의 의사 난수를 쓴다.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const habits: { categoryId: string; memos: string[]; min: number; max: number; chance: number }[] = [
  { categoryId: "food", memos: ["점심", "저녁 장보기", "편의점", "배달 저녁", "분식"], min: 6_000, max: 32_000, chance: 0.85 },
  { categoryId: "cafe", memos: ["아메리카노", "라떼", "빵집"], min: 3_500, max: 9_000, chance: 0.55 },
  { categoryId: "transit", memos: ["지하철", "버스", "택시"], min: 1_500, max: 14_000, chance: 0.6 },
  { categoryId: "shopping", memos: ["온라인 주문", "생필품", "옷"], min: 12_000, max: 68_000, chance: 0.12 },
  { categoryId: "living", memos: ["세탁", "다이소", "약국"], min: 3_000, max: 24_000, chance: 0.15 },
  { categoryId: "culture", memos: ["영화", "책", "전시"], min: 9_000, max: 28_000, chance: 0.08 },
];

function roundTo100(value: number) {
  return Math.round(value / 100) * 100;
}

function monthEntries(year: number, month: number, lastDay: number, seed: number): Entry[] {
  const random = seededRandom(seed);
  const entries: Entry[] = [];
  const add = (day: number, kind: EntryKind, categoryId: string, amount: number, memo: string) => {
    const date = toDateKey(year, month, day);
    entries.push({ id: `${date}-${entries.length}`, date, kind, categoryId, amount, memo });
  };

  for (let day = 1; day <= lastDay; day += 1) {
    if (day === 10) add(day, "income", "salary", 3_150_000, `${month}월 급여`);
    if (day === 5) add(day, "expense", "housing", 520_000, "월세");
    if (day === 15) add(day, "expense", "housing", 58_000, "휴대폰 요금");
    if (day === 21) add(day, "income", "side", 180_000, "외주 정산");

    for (const habit of habits) {
      if (random() > habit.chance) continue;
      const memo = habit.memos[Math.floor(random() * habit.memos.length)];
      const amount = roundTo100(habit.min + random() * (habit.max - habit.min));
      add(day, "expense", habit.categoryId, amount, memo);
    }
  }
  return entries;
}

export const initialEntries: Entry[] = [
  ...monthEntries(2026, 10, daysInMonth(2026, 10), 1026),
  ...monthEntries(2026, 11, 18, 1126),
];
