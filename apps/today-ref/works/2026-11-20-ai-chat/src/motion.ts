// tastepin 모션 기본값의 곡선과 길이. 시트와 서랍, 메뉴, 펼침 영역은 스프링 없이 이 곡선으로 열고 같은 길로 닫는다.
export const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;

// 메뉴 패널과 작은 요소의 등장과 퇴장
export const quick = { duration: 0.22, ease: easeOutCubic };

// 화면 가장자리에서 들어오는 서랍과 바텀 시트
export const panel = { duration: 0.3, ease: easeOutCubic };
