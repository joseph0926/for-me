// identity.motion: 킥오프 휘슬처럼 짧고 단단하게. 흐림 등장은 쓰지 않는다.
export const ease = [0.2, 0.9, 0.3, 1] as const;

export const duration = {
  quick: 0.16,
  base: 0.22,
  slow: 0.26,
} as const;

// 구매 확인 창은 0.96배에서 200ms에 커지며 나타나고 같은 길로 사라진다(tastepin 게임 상점 모달 값).
export const pop = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease },
} as const;

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.base, ease },
} as const;

// 팩 개봉(tastepin 게임 상점 팩 개봉 값). 카드는 낮은 등급부터 0.45초 간격으로 뒤집히고,
// 가장 높은 카드는 0.7초 더 멈췄다 뒤집힌다. 첫 카드는 부채꼴이 한 줄로 서는 380ms 뒤에 시작한다.
export const fanSettle = 0.38;

export function revealSchedule(count: number): number[] {
  const gap = 0.45;
  const lastPause = 0.7;
  return Array.from({ length: count }, (_, index) => fanSettle + 0.2 + index * gap + (index === count - 1 ? lastPause : 0));
}
