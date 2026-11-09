import { stegaClean } from 'next-sanity'

/**
 * The indicator at the end of a navigational row or card (components/ui/link-arrow.tsx). A section
 * stores one choice for all its links. `external` keeps the meaning the old arrow carried: a
 * diagonal arrow for a link that leaves the site, a plain one for a page on it. Kept free of Studio
 * code so the site can import it.
 */
export const LINK_ARROWS = ['chevron', 'arrow', 'external', 'none'] as const
export type LinkArrowStyle = (typeof LINK_ARROWS)[number]

export const LINK_ARROW_TITLES: Record<LinkArrowStyle, string> = {
  chevron: 'Chevron',
  arrow: 'Arrow',
  external: 'External link',
  none: 'None',
}

export const LINK_ARROW_DESCRIPTIONS: Record<LinkArrowStyle, string> = {
  chevron: 'A quiet › on every link.',
  arrow: 'A → on every link.',
  external: '↗ for links to other websites, → for pages on this one.',
  none: 'No indicator.',
}

/** The stored choice, or `fallback` (the layout's default) when it is unset or unknown. */
export function linkArrowOf(
  value: string | null | undefined,
  fallback: LinkArrowStyle,
): LinkArrowStyle {
  const clean = stegaClean(value)
  return LINK_ARROWS.find((option) => option === clean) ?? fallback
}

/**
 * How the indicator moves when its card is hovered or focused (components/ui/action-indicator.tsx).
 * Studio-free, like the glyphs above.
 */
export const ACTION_MOTIONS = ['none', 'nudge', 'lift', 'draw'] as const
export type ActionMotion = (typeof ACTION_MOTIONS)[number]

export const ACTION_MOTION_TITLES: Record<ActionMotion, string> = {
  none: 'None',
  nudge: 'Nudge',
  lift: 'Lift',
  draw: 'Draw',
}

export const ACTION_MOTION_DESCRIPTIONS: Record<ActionMotion, string> = {
  none: 'Stays still.',
  nudge: 'Moves a little in the direction it points.',
  lift: 'Rises a little.',
  draw: 'Draws itself once. Reduced motion keeps it still.',
}
