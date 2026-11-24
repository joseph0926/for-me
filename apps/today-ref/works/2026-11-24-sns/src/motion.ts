// 움직임 값. 출처는 사용자의 디자인 취향(tastepin) 모션 기본값과 컴포넌트 값이다.
import type { Transition } from "motion/react";

export const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;
export const easeOutQuint = [0.22, 1, 0.36, 1] as const;

// 작은 요소의 자리 이동과 등장.
export const spring: Transition = { type: "spring", visualDuration: 0.25, bounce: 0.15 };
// 누르는 동안 0.95배.
export const press = { scale: 0.95, transition: { duration: 0.12, ease: "easeOut" } } as const;
// 화면 전환: 24px 이동과 2px 흐림을 거쳐 240ms 겹쳐 교차.
export const pageShift = 24;
export const pageTransition: Transition = { duration: 0.24, ease: easeOutCubic };
// 가장자리에서 들어오는 큰 면(글쓰기 시트)은 스프링 없이 곡선으로 300ms.
export const sheetTransition: Transition = { duration: 0.3, ease: easeOutCubic };
// 대화상자와 사진 크게 보기: 0.96배에서 커지며 300ms.
export const dialogTransition: Transition = { duration: 0.3, ease: easeOutCubic };
