import type { ReactNode, SVGProps } from "react";

import type { AmenityId } from "../data";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const ChevronLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const ChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const ChevronDown = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const HeartIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => (
  <Icon {...props}>
    <path
      d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <svg width={props.size ?? 14} height={props.size ?? 14} viewBox="0 0 24 24" aria-hidden="true" className={props.className}>
    <path
      fill="currentColor"
      d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7L12 2.8Z"
    />
  </svg>
);

export const MapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Icon>
);

export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);

export const SlidersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Icon>
);

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
  </Icon>
);

export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

const AMENITY_PATHS: Record<AmenityId, ReactNode> = {
  wifi: (
    <>
      <path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.5 7.5 0 0 1 11 0M9.5 16a3 3 0 0 1 5 0" />
      <path d="M12 19h.01" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
    </>
  ),
  kitchen: (
    <>
      <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6" />
      <path d="M17 21V3c-2 1-3 3.5-3 7h3" />
    </>
  ),
  washer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="13" r="4.5" />
      <path d="M7.5 6.5h.01M10.5 6.5h3" />
    </>
  ),
  bathtub: (
    <>
      <path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2Z" />
      <path d="M6 12V6a2 2 0 0 1 3.6-1.2M7 19l-1 2M17 19l1 2" />
    </>
  ),
  breakfast: (
    <>
      <path d="M4 10h13v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5" />
    </>
  ),
  workspace: (
    <>
      <rect x="3.5" y="5" width="17" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </>
  ),
  selfCheckin: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15.5 12v2" />
    </>
  ),
  pet: (
    <>
      <circle cx="6" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14.5" cy="6" r="1.8" />
      <circle cx="18.5" cy="10" r="1.8" />
      <path d="M12.2 11.5c-2.4 0-5 3.5-5 5.7 0 2.4 2.6 1.8 5 1.8s5 .6 5-1.8c0-2.2-2.6-5.7-5-5.7Z" />
    </>
  ),
};

export function AmenityIcon({ id, ...props }: IconProps & { id: AmenityId }) {
  return <Icon {...props}>{AMENITY_PATHS[id]}</Icon>;
}
