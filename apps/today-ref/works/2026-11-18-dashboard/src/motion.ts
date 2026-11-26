// tastepin 모션 기본값을 한곳에 둔다. 곡선은 ease-out-cubic, 기본 길이는 220ms다.
export const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;
export const EASE_OUT_QUINT = [0.23, 1, 0.32, 1] as const;

// 곡선으로 움직이는 등장과 퇴장, 메뉴 패널
export const CURVE = { duration: 0.22, ease: EASE_OUT_CUBIC };

// 선택 표시처럼 작은 요소의 자리 이동. 끝에서 아주 조금 넘었다가 가라앉는다.
export const SPRING = { type: "spring", visualDuration: 0.25, bounce: 0.15 } as const;

// 흐림이 걷히며 등장하고 같은 길로 흐려지며 사라진다.
export const BLUR_IN = {
  initial: { opacity: 0, scale: 0.97, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.97, filter: "blur(4px)" },
  transition: CURVE,
};
