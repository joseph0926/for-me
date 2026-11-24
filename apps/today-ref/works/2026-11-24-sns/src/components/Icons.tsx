// 선 아이콘. 24 격자, 1.8 굵기. 채운 모양은 눌린 상태에만 쓴다.
import type { ReactNode, SVGProps } from "react";

type IconProps = { size?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, "fill">;

function Icon({ size = 20, filled = false, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" fill="none" />
  </Icon>
);

export const BookmarkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-4-6 4V4.5a.5.5 0 0 1 .5-.5" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6z" />
  </Icon>
);

export const PenIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M15.5 4.5 19.5 8.5 9 19H5v-4z" />
    <path d="m13.5 6.5 4 4" />
  </Icon>
);

export const ReplyIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5z" />
  </Icon>
);

export const RepostIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M4.5 11V9a2.5 2.5 0 0 1 2.5-2.5h11" />
    <path d="m15.5 3.5 3 3-3 3" />
    <path d="M19.5 13v2a2.5 2.5 0 0 1-2.5 2.5H6" />
    <path d="m8.5 20.5-3-3 3-3" />
  </Icon>
);

export const HeartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7" />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
  </Icon>
);

export const MoreIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <circle cx="5.5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1" fill="currentColor" />
  </Icon>
);

export const BackIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M19 12H5.5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const MinimizeIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M6 12h12" />
  </Icon>
);

export const ImageIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 16-5-5-8.5 8.5" />
  </Icon>
);

export const ChevronIcon = ({ direction = "down", ...props }: IconProps & { direction?: "down" | "up" | "left" | "right" }) => {
  const d = { down: "m6 9 6 6 6-6", up: "m6 15 6-6 6 6", left: "m15 6-6 6 6 6", right: "m9 6 6 6-6 6" }[direction];
  return (
    <Icon {...props} filled={false}>
      <path d={d} />
    </Icon>
  );
};

export const PinIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M9 4h6l-1 5 3 3H7l3-3z" />
    <path d="M12 12v8" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
  </Icon>
);

export const UserPlusIcon = (props: IconProps) => (
  <Icon {...props} filled={false}>
    <circle cx="10" cy="8.5" r="3.5" />
    <path d="M3.5 19.5c.7-3.3 3.3-5.1 6.5-5.1 1.4 0 2.6.3 3.6.9" />
    <path d="M18 14v6M15 17h6" />
  </Icon>
);
