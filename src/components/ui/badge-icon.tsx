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
