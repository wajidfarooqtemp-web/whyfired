import type { ReactNode } from "react";

// Small inline icon set (stroke icons that inherit the text colour).
// Shared by the feed now and the navbar next.
interface IconProps {
  size?: number;
  filled?: boolean;
  className?: string;
}

function Svg({ size = 20, className, children, filled }: IconProps & { children: ReactNode }) {
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
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></Svg>
);
export const PlusSquareIcon = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></Svg>
);
export const BookIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" /></Svg>
);
export const ChartIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 20v-9M12 20V4M19 20v-6" /></Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5l8 11H4z" /></Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 19L4 8h16z" /></Svg>
);
export const CommentIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /></Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Svg>
);

// Official verified badge: a filled blue disc with a white checkmark,
// used only next to "Why Fired" on posts an admin published directly
// (see FeedPost's posted_as_official handling). Deliberately not a
// stroke icon like the others above; it needs its own fixed colours
// so it stays a badge regardless of the surrounding text colour.
export const VerifiedBadge = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    role="img"
    aria-label="Verified account"
  >
    <circle cx="12" cy="12" r="11" fill="#1d9bf0" />
    <path
      d="M7.2 12.6l3.1 3.1 6.5-7"
      fill="none"
      stroke="#fff"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);