// 모션 값(topic.json identity.motion). 사진은 손가락을 따라오고, 그 밖의 전환은 짧게 감속한다. 흐림 등장은 쓰지 않는다.
export const settle = [0.25, 1, 0.5, 1] as const;

export const quick = { duration: 0.18, ease: settle };
// 아래에서 올라오는 시트는 tastepin 드로어 값(곡선 300ms, 스프링 없이)을 따른다
export const sheet = { duration: 0.3, ease: settle };
// 알림 띠는 tastepin 토스트 값(느긋한 300ms ease)으로 아래 가장자리 16px에서 들어오고 같은 길로 나간다
export const toast = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };
// 단위 전환에서 고른 칸 표시가 옆 칸으로 미끄러지는 길이
export const thumb = { duration: 0.2, ease: settle };
// 칸에서 사진 보기로 커지고 다시 칸으로 돌아가는 움직임. 튕김 없이 멈춘다.
export const photoSpring = { type: "spring", duration: 0.26, bounce: 0 } as const;
// 추억 한 장이 머무는 시간. 그동안 사진이 천천히 커지는 움직임은 styles.css의 memory-drift가 같은 길이로 맡는다.
export const memorySlideMs = 3500;
