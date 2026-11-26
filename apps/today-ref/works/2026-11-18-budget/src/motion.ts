// 화면 곳곳에서 같은 움직임을 쓰도록 tastepin 모션 값을 한곳에 둔다.
import type { Transition, Variants } from "motion/react";

// 모션 기본값의 곡선: 셋 중 가장 고르게 속도를 줄이는 ease-out-cubic.
export const easeOut = [0.215, 0.61, 0.355, 1] as const;

// 숫자 바뀜 값의 곡선: ease-out-quint.
export const easeOutQuint = [0.23, 1, 0.32, 1] as const;

// 선택 표시처럼 작은 요소가 자리를 옮길 때 쓰는 스프링(모션 기본값 visualDuration 0.25, bounce 0.15).
export const smallSpring: Transition = { type: "spring", visualDuration: 0.25, bounce: 0.15 };

// 앞뒤가 있는 전환(탭, 달 넘김): 앞으로 가면 오른쪽 24px에서 들어오고 이전 내용은 왼쪽으로 나간다.
// custom으로 방향(1 또는 -1)을 받는다.
export const slideVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: 24 * direction, filter: "blur(2px)" }),
  // 다 들어온 뒤에는 filter를 걷어 스크롤하는 화면에 흐림 계층이 남지 않게 한다.
  center: { opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: (direction: number) => ({ opacity: 0, x: -24 * direction, filter: "blur(2px)" }),
};
