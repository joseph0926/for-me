import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
};

function Svg({
  size = 24,
  className,
  strokeWidth = 1.8,
  filled = false,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.6-4.6" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.3s-8.3-4.9-8.3-11a4.6 4.6 0 0 1 8.3-2.7 4.6 4.6 0 0 1 8.3 2.7c0 6.1-8.3 11-8.3 11Z" />
    </Svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.6-3.6 3.7-5.8 7.5-5.8s6.9 2.2 7.5 5.8" />
    </Svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.3-4.4A8.5 8.5 0 1 1 20.5 11.6Z" />
    </Svg>
  );
}

export function RepostIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 2.5 20.5 6 17 9.5" />
      <path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5" />
      <path d="M7 21.5 3.5 18 7 14.5" />
      <path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5" />
    </Svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 3 10.2 13.8" />
      <path d="M21 3 14.4 21l-4.2-7.2L3 9.6Z" />
    </Svg>
  );
}

export function MoreIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 4.5-7.5 7.5 7.5 7.5" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 text-ink" aria-label="인증된 계정" role="img">
      <path
        fill="currentColor"
        d="M12 1.8 14.6 4l3.4-.3.9 3.3 3 1.7-1.3 3.2 1.3 3.2-3 1.7-.9 3.3-3.4-.3L12 22.2 9.4 20l-3.4.3-.9-3.3-3-1.7 1.3-3.2-1.3-3.2 3-1.7.9-3.3 3.4.3Z"
      />
      <path d="m8 12.2 2.8 2.8L16.2 9.5" fill="none" stroke="var(--surface)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
