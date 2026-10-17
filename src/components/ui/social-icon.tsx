import type { ReactNode } from 'react'

import type { SocialPlatform } from '@/lib/social-platforms'

/**
 * Simple outline marks on a 24 px grid, in one stroke weight like the badge icons: recognisable at
 * 20 px, not the networks' own logos (those carry brand rules we don't want to police in a template).
 */
const PATHS: Record<SocialPlatform, ReactNode> = {
  facebook: (
    <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V20H14v-5.5h2.5L17 11h-3V8.5a.5.5 0 0 1 .5-.5Z" />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="0.6" />
    </>
  ),
  linkedin: <path d="M6 10v8M6 6.2v.1M10.5 18v-8m0 3.2c0-1.8 1.2-3.2 3-3.2s3 1.2 3 3.4V18" />,
  x: <path d="m5 5 14 14M19 5 5 19" />,
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="m10.5 9.5 4 2.5-4 2.5v-5Z" />
    </>
  ),
  tiktok: <path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2M14 4c.3 2.3 1.9 3.9 4.2 4.2" />,
  pinterest: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M11 16.5 12.2 11M10.2 13.2a2.4 2.4 0 1 1 4 1.7" />
    </>
  ),
  google: <path d="M19 12.3h-6.8M18.6 8.2A7.2 7.2 0 1 0 19.2 12.3" />,
  other: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5Z" />
    </>
  ),
}

interface Props {
  /** A stored platform; an unknown one (a later release's network) draws the generic mark. */
  platform: string | null | undefined
  className?: string
}

/** A decorative mark: the link around it carries the accessible name ("Instagram"). */
export function SocialIcon({ platform, className = '' }: Props) {
  const paths = (PATHS as Partial<Record<string, ReactNode>>)[platform ?? '']
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
      className={`size-5 shrink-0 ${className}`}
    >
      {paths ?? PATHS.other}
    </svg>
  )
}
