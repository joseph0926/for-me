// 화면에서 쓰는 선 아이콘. 24 단위 격자에 1.8 굵기로 그린다.
const paths = {
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  prev: "M7 6v12M18 6l-9 6 9 6z",
  next: "M17 6v12M6 6l9 6-9 6z",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M9 6l6 6-6 6",
  folder: "M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z",
  home: "M4 11l8-6.5 8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  library: "M4 5h4v14H4zM10 5h4v14h-4zM16.5 5.5l3.6.9-3 12.9-3.6-.9z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13z",
  unlock: "M7 11V8a5 5 0 0 1 9.6-2M5.5 11h13v9h-13z",
  subtitles: "M3.5 6h17v12h-17zM7 13.5h4M13 13.5h4M7 10.5h10",
  rotate: "M4 7.5h9.5a2 2 0 0 1 2 2V20M4 7.5l3-3M4 7.5l3 3M20 13v5a2 2 0 0 1-2 2h-2.5",
  replay: "M5 12a7 7 0 1 0 2.1-5M5 4.5V9h4.5",
  plus: "M12 6v12M6 12h12",
  minus: "M6 12h12",
  check: "M5 12.5l4.5 4.5L19 7.5",
  file: "M7 3.5h7l4 4V20.5H7zM14 3.5V8h4",
  forward: "M4 6l7 6-7 6zM12 6l7 6-7 6z",
  rewind: "M20 6l-7 6 7 6zM12 6l-7 6 7 6z",
} as const;

export type IconName = keyof typeof paths;

const filled = new Set<IconName>(["play", "pause", "forward", "rewind"]);

export function Icon({ name, size = 22, className = "" }: { name: IconName; size?: number; className?: string }) {
  const isFilled = filled.has(name) || name === "prev" || name === "next";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={isFilled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled.has(name) ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
