import type { CSSProperties } from 'react'

import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'

const PATHS = {
  chevron: 'm10 7 5 5-5 5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  out: 'M8 16 16 8m-6 0h6v6',
} as const

/**
 * The indicator at the end of a link row or card, on the 24 px grid and stroke of the badge icons.
 * Decorative: the link's own text (and, for other websites, SanityLink's new-tab wording) says where
 * it goes. `external` is whether the link leaves the site, which only the External link style draws.
 * Size and hover movement come from `className`, so each layout keeps its own alignment.
 */
export function LinkArrow({
  arrow,
  external,
  className = '',
  style,
}: {
  arrow: LinkArrowStyle
  external: boolean
  className?: string
  style?: CSSProperties
}) {
  if (arrow === 'none') return null
  const path =
    arrow === 'chevron' ? PATHS.chevron : arrow === 'external' && external ? PATHS.out : PATHS.arrow
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
      data-link-arrow={arrow}
      className={`size-6 shrink-0 ${className}`}
      style={style}
    >
      <path d={path} />
    </svg>
  )
}
