// 선 굵기 1.75의 24px 아이콘. 채움이 의미인 아이콘(재생, 좋아요 켜짐)만 면으로 그린다.
const paths = {
  play: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />,
  pause: (
    <g fill="currentColor" stroke="none">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </g>
  ),
  next: (
    <g fill="currentColor" stroke="none">
      <path d="M4 5.5v13L13.5 12z" />
      <path d="M12 5.5v13L21.5 12z" />
    </g>
  ),
  prev: (
    <g fill="currentColor" stroke="none">
      <path d="M20 5.5v13L10.5 12z" />
      <path d="M12 5.5v13L2.5 12z" />
    </g>
  ),
  shuffle: <path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 4.8c1.1 1.6 2.3 2.6 4.3 2.6H21m0 0-2.5-2.5M21 17l-2.5 2.5M3 17h3.5c1.4 0 2.4-.5 3.2-1.3M21 7h-3.5c-1.4 0-2.4.5-3.2 1.3M21 7l-2.5-2.5M21 7l-2.5 2.5" />,
  repeat: <path d="M17 3.5 20 6.5l-3 3M20 6.5H8a4 4 0 0 0-4 4V12m3 8.5-3-3 3-3m-3 3h12a4 4 0 0 0 4-4V12" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  heartFilled: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill="currentColor" />,
  more: (
    <g fill="currentColor" stroke="none">
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </g>
  ),
  down: <path d="m6 9.5 6 6 6-6" />,
  back: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  lyrics: <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5H4.5zM8 9.5h8M8 12.5h5" />,
  queue: <path d="M4 6.5h12M4 11.5h12M4 16.5h7M16 14.5v5.5l4.5-2.75z" />,
  grip: <path d="M5 9h14M5 15h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />,
  library: <path d="M5 4v16M9.5 4v16M14 4.5l4.8 15" />,
  clock: (
    <g>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </g>
  ),
  chart: <path d="M5 19.5V13M10 19.5V6M15 19.5v-9M20 19.5v-4.5" />,
  disc: (
    <g>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  // 다음에 재생과 맨 뒤에 추가는 재생 세모가 놓인 줄(맨 위, 맨 아래)로, 플레이리스트에 담기는 +로 구분한다.
  queueNext: <path d="M4 4.25v4.5l3.75-2.25zM11 6.5h9M4 12h16M4 17.5h16" />,
  queueEnd: <path d="M4 6.5h16M4 12h16M4 15.25v4.5l3.75-2.25zM11 17.5h9" />,
  addTo: <path d="M4 6.5h10M4 11.5h10M4 16.5h6M17 12v8M13 16h8" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
