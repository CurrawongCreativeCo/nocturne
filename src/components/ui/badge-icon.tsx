import type { ReactNode } from 'react'

import type { BadgeIconName } from '@/lib/sanity/badge-icons'

/** Outline drawings on a 24 px grid, one stroke weight, for the badge icons in `BADGE_ICONS`. */
export const BADGE_ICON_PATHS: Record<BadgeIconName, ReactNode> = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  star: (
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
  ),
  shield: <path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-2.5Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
  ),
  bolt: <path d="M13 3 5.5 13.5H11L10 21l8.5-11H13L13 3Z" />,
  leaf: (
    <>
      <path d="M5 19C5 10 10 5 19.5 4.5 19 14 14 19 5 19Z" />
      <path d="M5 19c2-4 5-7 9-9" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="m9 14.5-1.5 6 4.5-2.5 4.5 2.5-1.5-6" />
    </>
  ),
  care: (
    <>
      <path d="M12 11.5V8.5m0 0c0-2 1.3-3.5 3.5-3.5 0 2-1.3 3.5-3.5 3.5Zm0 0c0-2-1.3-3.5-3.5-3.5 0 2 1.3 3.5 3.5 3.5Z" />
      <path d="M3.5 13.5c.5 4 3.8 6.5 8.5 6.5s8-2.5 8.5-6.5" />
      <path d="m3.5 13.5 3-1.5m14 1.5-3-1.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2m0 13v2M3.5 12h2m13 0h2M6 6l1.4 1.4m9.2 9.2L18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="10" r="4.5" />
      <circle cx="15" cy="10" r="4.5" />
      <circle cx="12" cy="15" r="4.5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4m7-4v4" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3L11 7.5l-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
  ),
}

interface Props {
  /** A stored value; an unknown one (a later release's icon) draws nothing rather than breaking. */
  name: string | null | undefined
  className?: string
}

/** A decorative icon: hidden from screen readers, since the badge's label says it all. */
export function BadgeIcon({ name, className = '' }: Props) {
  const paths = name ? BADGE_ICON_PATHS[name as BadgeIconName] : undefined
  if (!paths) return null

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`size-4 shrink-0 ${className}`}
    >
      {paths}
    </svg>
  )
}
