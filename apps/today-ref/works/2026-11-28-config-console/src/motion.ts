// 모션 값(topic.json identity.motion). 운영 도구라 짧고 절제해서 움직이고 흐림 등장은 쓰지 않는다.
export const settle = [0.25, 1, 0.5, 1] as const;

export const quick = { duration: 0.12, ease: settle };
// 펼침 메뉴는 버튼 쪽에서 140ms에 펼쳐진다(tastepin 드롭다운 메뉴 값).
export const menu = { duration: 0.14, ease: settle };
// 검색으로 빠지는 행이 접히는 길이(tastepin 검색 값 180ms)
export const collapse = { duration: 0.18, ease: settle };
export const panel = { duration: 0.2, ease: settle };
// 게시 뒤 바뀐 칸의 초록 바탕이 한 번 옅어지는 길이. 눈에 띄도록 다른 움직임보다 길게 둔다.
export const publishedFade = { duration: 1.4, ease: "easeOut" } as const;
