// 선 굵기 1.6의 24px 격자 아이콘. 색은 currentColor를 따른다.
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
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

export const LibraryIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    <path d="m3 16 4-4 3 3 2-2 5 5" />
  </Icon>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </Icon>
);
export const FolderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
  </Icon>
);
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);
export const ChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const ChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8Z" />
  </Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.1" />
  </Icon>
);
export const PlayIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.3-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
  </Icon>
);
export const PauseIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <rect x="6.5" y="5" width="4" height="14" rx="1" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" />
  </Icon>
);
export const BackTenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
    <path d="M4.5 4.5V9H9" />
  </Icon>
);
export const ForwardTenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9" />
    <path d="M19.5 4.5V9H15" />
  </Icon>
);
export const VolumeIcon = ({ muted, ...p }: IconProps & { muted?: boolean }) => (
  <Icon {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" />
    {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
  </Icon>
);
export const LoopIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 4.5 19.5 7 17 9.5" />
    <path d="M19.5 7H8a4 4 0 0 0-4 4v.5M7 19.5 4.5 17 7 14.5" />
    <path d="M4.5 17H16a4 4 0 0 0 4-4v-.5" />
  </Icon>
);
export const ExpandIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5l-6 6M4.5 19.5l6-6" />
  </Icon>
);
export const FitIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M8 9.5v5M16 9.5v5" />
  </Icon>
);
export const FilmIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="6.5" width="17" height="11" rx="1.5" />
    <path d="M7.5 6.5v11M16.5 6.5v11" />
  </Icon>
);
export const ImportIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 15.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
  </Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7Z" />
    <circle cx="8" cy="9" r="1.3" />
  </Icon>
);
export const RestoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
    <path d="M4.5 4.5V9H9" />
  </Icon>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);
export const ZoomOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2M8.5 11h5" />
  </Icon>
);
export const ZoomInIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2M8.5 11h5M11 8.5v5" />
  </Icon>
);
export const VideoBadgeIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="6.5" width="12" height="11" rx="2" />
    <path d="m15.5 10.5 5-3v9l-5-3" />
  </Icon>
);

// 편집기 도구와 동작 아이콘.
export const PointerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 3.5 13 6.2-5.6 1.7-2.2 5.6Z" />
  </Icon>
);
export const CropIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 2.5v14a1 1 0 0 0 1 1h14M2.5 6.5h14a1 1 0 0 1 1 1v14" />
  </Icon>
);
export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);
export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <circle cx="15" cy="15" r="5.5" />
  </Icon>
);
export const PenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19Z" />
    <path d="m13.5 7 3.5 3.5" />
  </Icon>
);
export const TextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6" />
  </Icon>
);
export const ShapeIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="10" height="10" rx="1" />
    <path d="M12 20.5 20.5 12M15 12h5.5v5.5" />
  </Icon>
);
export const RotateLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5 4 7.5l3 3" />
    <path d="M4 7.5h9a6.5 6.5 0 1 1-6.5 6.5" />
  </Icon>
);
export const RotateRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m17 4.5 3 3-3 3" />
    <path d="M20 7.5h-9A6.5 6.5 0 1 0 17.5 14" />
  </Icon>
);
export const FlipHIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v18M9 7 4 17h5ZM15 7l5 10h-5Z" />
  </Icon>
);
export const FlipVIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h18M7 9 17 4v5ZM7 15l10 5v-5Z" />
  </Icon>
);
export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5 4 9l4 4" />
    <path d="M4 9h10a5.5 5.5 0 0 1 0 11h-3" />
  </Icon>
);
export const RedoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m16 5 4 4-4 4" />
    <path d="M20 9H10a5.5 5.5 0 0 0 0 11h3" />
  </Icon>
);
export const CompareIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <path d="M12 2.5v19" />
  </Icon>
);
export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
  </Icon>
);
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
    <path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
  </Icon>
);
export const ResetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
    <path d="M4.5 4.5V9H9" />
  </Icon>
);
export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 4" />
  </Icon>
);
