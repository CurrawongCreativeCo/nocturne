import type { CSSProperties } from 'react'

import { IconContainer } from '@/components/ui/icon-container'
import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import type { IconDesign, OwnIcon } from '@/lib/sanity/surface-options'
import { themeColourStyle, type ThemeColourInput } from '@/lib/sanity/theme-colour'

/** The 'out' path is also what globals.css leaves unmirrored in right-to-left text. */
const PATHS = {
  chevron: 'm10 7 5 5-5 5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  out: 'M8 16 16 8m-6 0h6v6',
} as const

export const ACTION_MOTIONS = ['none', 'nudge', 'lift', 'draw'] as const
export type ActionMotion = (typeof ACTION_MOTIONS)[number]

/**
 * How far Nudge and Lift move. `standard` is the preset's own 3 px; the two legacy distances are what
 * the Link list's arrows moved before the shared component (2 px and 4 px), kept so a section that
 * chose nothing looks the same. They are not offered in Studio.
 */
export type ActionDistance = 'standard' | 'legacy-small' | 'legacy-large'

/** An optional container for the glyph, through the one `IconContainer` (task 158). */
export interface ActionContainer {
  design?: IconDesign
  own: OwnIcon
  /** The container's width and height classes. */
  size?: string
}

/**
 * The indicator at the end of a linked row or card, on the 24 px grid and stroke of the badge icons.
 * Decorative: the link's own text (and, for other websites, SanityLink's new-tab wording) says where
 * it goes, so it is `aria-hidden` and the card stays one keyboard destination. `external` is whether
 * the link leaves the site, which only the External link glyph draws.
 *
 * Interaction is CSS only (globals.css, `[data-action-motion]`): the nearest `.group` ancestor, the
 * link, moves it on hover and on keyboard focus alike, and reduced motion keeps it still. Size and
 * layout come from `className`, so each place keeps its own alignment.
 */
export function ActionIndicator({
  glyph,
  external,
  motion = 'none',
  distance = 'standard',
  container,
  colour,
  className = '',
  style,
}: {
  glyph: LinkArrowStyle
  external: boolean
  motion?: ActionMotion
  distance?: ActionDistance
  container?: ActionContainer
  /** A theme colour; it sets `color`, which the glyph and a plain container follow. */
  colour?: ThemeColourInput | null
  className?: string
  style?: CSSProperties
}) {
  if (glyph === 'none') return null
  const out = glyph === 'external' && external
  const path = glyph === 'chevron' ? PATHS.chevron : out ? PATHS.out : PATHS.arrow
  const themed = themeColourStyle(colour)
  const merged = themed || style ? { ...themed, ...style } : undefined
  // Motion lives on the outermost box, so a container and its glyph move together.
  const motionProps =
    motion === 'none'
      ? {}
      : {
          'data-action-motion': motion,
          'data-action-distance': distance,
          'data-action-direction': out ? 'out' : 'inline',
        }
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-link-arrow={glyph}
      className={`size-6 shrink-0 ${container ? '' : className}`}
      style={container ? undefined : merged}
      {...(container ? {} : motionProps)}
    >
      <path d={path} {...(motion === 'draw' ? { pathLength: 1 } : {})} />
    </svg>
  )
  if (!container) return svg
  return (
    <IconContainer
      design={container.design}
      own={container.own}
      size={container.size}
      keepBox
      className={className}
      style={merged}
      {...motionProps}
    >
      {svg}
    </IconContainer>
  )
}
