import type { SVGProps } from "react";

// 16px 격자에 1.5px 선으로 그린 아이콘. 색은 currentColor를 따른다.
const PATHS = {
  inbox: "M2.5 9.5h3l1 2h3l1-2h3M3.6 3.5h8.8l1.1 6v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-3z",
  globe:
    "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2 8h12M8 2c1.6 1.7 2.4 3.7 2.4 6S9.6 12.3 8 14C6.4 12.3 5.6 10.3 5.6 8S6.4 3.7 8 2Z",
  pen: "M10.5 3.2 12.8 5.5M3 13l.6-2.7 7.6-7.6a1 1 0 0 1 1.4 0l.7.7a1 1 0 0 1 0 1.4L5.7 12.4z",
  book: "M3 3.5A1.5 1.5 0 0 1 4.5 2H13v10H4.5A1.5 1.5 0 0 0 3 13.5zm0 10A1.5 1.5 0 0 0 4.5 15H13v-3",
  target: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Zm0-3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-3h.01",
  report: "M4 2h5.5L12 4.5V14H4zM9 2v3h3M6 8.5h4M6 11h4",
  search: "M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10Zm3.6-1.4L14 14",
  chevronDown: "m4 6 4 4 4-4",
  chevronRight: "m6 4 4 4-4 4",
  chevronLeft: "m10 4-4 4 4 4",
  filter: "M2.5 4h11M4.5 8h7M6.5 12h3",
  close: "m4.5 4.5 7 7m0-7-7 7",
  calendar: "M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5zM3 7h10M6 2v2M10 2v2",
  check: "m3.5 8.5 3 3 6-7",
  expand: "M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9",
  collapse: "M13.5 2.5 9 7m0-3.5V7h3.5M2.5 13.5 7 9m0 3.5V9H3.5",
  external: "M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5V13a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 3 13V5a.5.5 0 0 1 .5-.5H7",
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  star: "m8 2.2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4l-3.6 1.9.7-4-2.9-2.8 4-.6z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
