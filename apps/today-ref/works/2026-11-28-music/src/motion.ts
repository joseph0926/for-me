// 모션 값(topic.json identity.motion). 바늘이 내려앉듯 무게 있게 감속하고 흐림 등장은 쓰지 않는다.
export const settle = [0.22, 1, 0.36, 1] as const;

export const sheet = { duration: 0.32, ease: settle };
export const push = { duration: 0.26, ease: settle };
export const quick = { duration: 0.22, ease: settle };
// 곡이 바뀔 때 재생 화면 배경이 따라 바뀌는 길이. 다른 움직임보다 느리게 둔다.
export const toneChange = { duration: 0.6, ease: "easeInOut" } as const;
