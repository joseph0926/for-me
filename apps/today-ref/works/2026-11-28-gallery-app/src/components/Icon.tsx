// 선 굵기 1.75의 24px 아이콘. 채운 모양이 필요한 하트와 재생만 fill을 쓴다.
const paths = {
  library: (
    <>
      <rect x="3.5" y="5.5" width="17" height="14" rx="1.5" />
      <path d="m3.5 16 4.6-4.6a1.5 1.5 0 0 1 2.1 0L15 16.2" />
      <path d="m13.5 14.7 1.8-1.8a1.5 1.5 0 0 1 2.1 0l3.1 3.1" />
      <circle cx="15.5" cy="9.5" r="1.4" />
    </>
  ),
  albums: (
    <>
      <rect x="3.5" y="7.5" width="13" height="13" rx="1.5" />
      <path d="M7.5 4.5h11a2 2 0 0 1 2 2v11" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  heart: <path d="M12 19.5s-7.5-4.4-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.2-7.5 9.6-7.5 9.6Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  back: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  close: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m6.5 12.5 3.6 3.5 7.4-8" />,
  play: <path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8Z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  restore: (
    <>
      <path d="M5 12a7 7 0 1 0 2.1-5" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  albumAdd: (
    <>
      <rect x="3.5" y="7.5" width="13" height="13" rx="1.5" />
      <path d="M7.5 4.5h11a2 2 0 0 1 2 2v11M10 11v6M7 14h6" />
    </>
  ),
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
} as const;

export type IconName = keyof typeof paths;

const filled: Partial<Record<IconName, true>> = { play: true };

export function Icon({ name, size = 24, fill = false, className }: { name: IconName; size?: number; fill?: boolean; className?: string }) {
  const solid = fill || filled[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"}
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
