import React from "react";

export type IconName =
  | "clock"
  | "pin"
  | "indoor"
  | "outdoor"
  | "users"
  | "share"
  | "check"
  | "search"
  | "arrow"
  | "x"
  | "calendar"
  | "bell"
  | "phone"
  | "message"
  | "trash"
  | "list";

const PATHS: Record<IconName, React.ReactNode> = {
  clock: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </>
  ),
  pin: (
    <>
      <path d="M8 14s5-4.5 5-8A5 5 0 003 6c0 3.5 5 8 5 8z" />
      <circle cx="8" cy="6" r="1.6" />
    </>
  ),
  indoor: (
    <>
      <path d="M2.5 7L8 2.5 13.5 7" />
      <path d="M4 6.5V13h8V6.5" />
      <path d="M6.8 13V9.5h2.4V13" />
    </>
  ),
  outdoor: (
    <>
      <path d="M8 1.5v13" />
      <path d="M8 6l3.5-2M8 6L4.5 4M8 9.5l3.5-2M8 9.5L4.5 7.5" />
    </>
  ),
  users: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <path d="M2.5 13c0-2 1.6-3.4 3.5-3.4S9.5 11 9.5 13" />
      <path d="M10.5 9.8c1.6.2 2.8 1.4 2.8 3.2" />
      <circle cx="11" cy="6" r="1.8" />
    </>
  ),
  share: (
    <>
      <circle cx="12" cy="4" r="1.8" />
      <circle cx="4" cy="8" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M10.5 5L5.5 7M5.5 9l5 2" />
    </>
  ),
  check: <path d="M3.5 8.5l3 3 6-7" />,
  search: (
    <>
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" />
    </>
  ),
  arrow: <path d="M3 8h10M9 4l4 4-4 4" />,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </>
  ),
  bell: (
    <>
      <path d="M8 2.5a4 4 0 0 0-4 4v3l-1.5 2h11L12 9.5v-3a4 4 0 0 0-4-4z" />
      <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  phone: (
    <path d="M3 4c0 8 5 13 13 13l-2-4-3 1c-2-1-4-3-5-5l1-3-4-2z" />
  ),
  message: (
    <>
      <path d="M2.5 4.5h11v7h-6l-3 2.5v-2.5h-2z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" />
    </>
  ),
  list: (
    <>
      <path d="M5 4h9M5 8h9M5 12h9" />
      <circle cx="2.5" cy="4" r="0.8" />
      <circle cx="2.5" cy="8" r="0.8" />
      <circle cx="2.5" cy="12" r="0.8" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  flip?: boolean;
}

export function Icon({ name, size = 15, className = "ic", flip = false }: IconProps) {
  return (
    <svg
      className={className + (flip ? " flip" : "")}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
