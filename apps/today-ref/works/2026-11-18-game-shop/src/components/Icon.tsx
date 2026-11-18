// 상점에서 쓰는 선 아이콘. 24px 격자에 맞춰 그렸다.
const paths = {
  featured: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  packs: "M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5zM3 7.5v9M21 7.5v9M9 9.5h6M9 13h6",
  topup: "M12 3l7 4v10l-7 4-7-4V7zM12 8v8M8 12h8",
  pass: "M5 4.5h14v15l-7-4-7 4zM9 9h6",
  history: "M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8h6M9 11.5h6M9 15h4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  lock: "M7 10.5V8a5 5 0 0 1 10 0v2.5M5.5 10.5h13v9h-13zM12 14v2.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  clock: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-5", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
