/**
 * What Studio shows for the site-wide choices on Brand colours (task 216): the order, titles and one
 * line each. The values match the keys of `SITE_DECISIONS` (site-decisions.ts), which a unit test
 * checks, so a choice can't be offered without something to render. Standard and Soft are today's
 * look: leaving the field empty is the same, and the picker shows them as chosen.
 */

export const DENSITIES = ['compact', 'standard', 'airy'] as const
export type Density = (typeof DENSITIES)[number]

export const DENSITY_TITLES: Record<Density, string> = {
  compact: 'Compact',
  standard: 'Standard',
  airy: 'Airy',
}

export const DENSITY_DESCRIPTIONS: Record<Density, string> = {
  compact: 'Tighter sections and side margins.',
  standard: 'The spacing the site has now.',
  airy: 'More room around every section.',
}

export const SHAPES = ['sharp', 'soft', 'round'] as const
export type Shape = (typeof SHAPES)[number]

export const SHAPE_TITLES: Record<Shape, string> = {
  sharp: 'Sharp',
  soft: 'Soft',
  round: 'Round',
}

export const SHAPE_DESCRIPTIONS: Record<Shape, string> = {
  sharp: 'Square, crisp corners on cards and panels.',
  soft: 'The corners the site has now.',
  round: 'Generously rounded cards and panels.',
}

export const HEADING_STYLE_OPTIONS = ['standard', 'editorial', 'modern', 'classic'] as const
export type HeadingStyleOption = (typeof HEADING_STYLE_OPTIONS)[number]

export const HEADING_STYLE_TITLES: Record<HeadingStyleOption, string> = {
  standard: 'Standard',
  editorial: 'Editorial',
  modern: 'Modern',
  classic: 'Classic',
}

export const HEADING_STYLE_DESCRIPTIONS: Record<HeadingStyleOption, string> = {
  standard: 'The headings the site has now.',
  editorial: 'Larger, lighter and tighter.',
  modern: 'Heavier and slightly tighter.',
  classic: 'A little smaller, with almost no tightening.',
}

/**
 * Shown under Heading style while Editorial is chosen. The site has one font today, so Editorial draws
 * in it; a display font is added to the build by Currawong (the pairings are listed in
 * `src/config/font-pairings.ts`).
 */
export const EDITORIAL_FONT_NOTE =
  'Editorial looks best with a display font, which the site doesn’t have yet. Until Currawong adds one it uses the site’s body font.'

/**
 * The site-wide button style on Brand colours → Buttons (task 148). Solid, Flat, Off and Outline are
 * today's look: leaving a field empty is the same, and the picker shows them as chosen.
 */
export const BUTTON_FILLS = ['solid', 'gradient'] as const
export type ButtonFill = (typeof BUTTON_FILLS)[number]

export const BUTTON_FILL_TITLES: Record<ButtonFill, string> = {
  solid: 'Solid',
  gradient: 'Brand gradient',
}

export const BUTTON_FILL_DESCRIPTIONS: Record<ButtonFill, string> = {
  solid: 'The button colour the site has now.',
  gradient: 'One of the gradients from Advanced, behind the main button’s text.',
}

export const BUTTON_DEPTHS = ['flat', 'soft', 'raised'] as const
export type ButtonDepth = (typeof BUTTON_DEPTHS)[number]

export const BUTTON_DEPTH_TITLES: Record<ButtonDepth, string> = {
  flat: 'Flat',
  soft: 'Soft',
  raised: 'Raised',
}

export const BUTTON_DEPTH_DESCRIPTIONS: Record<ButtonDepth, string> = {
  flat: 'No shadow, as now.',
  soft: 'A light shadow under the main button.',
  raised: 'A deeper shadow, as if lifted.',
}

export const BUTTON_GLOWS = ['off', 'soft', 'strong'] as const
export type ButtonGlow = (typeof BUTTON_GLOWS)[number]

export const BUTTON_GLOW_TITLES: Record<ButtonGlow, string> = {
  off: 'Off',
  soft: 'Soft',
  strong: 'Strong',
}

export const BUTTON_GLOW_DESCRIPTIONS: Record<ButtonGlow, string> = {
  off: 'No glow, as now.',
  soft: 'A faint halo of the Primary colour around the main button.',
  strong: 'A wider, brighter halo. Best on dark sections.',
}

export const SECONDARY_BUTTONS = ['outline', 'soft'] as const
export type SecondaryButton = (typeof SECONDARY_BUTTONS)[number]

export const SECONDARY_BUTTON_TITLES: Record<SecondaryButton, string> = {
  outline: 'Outline',
  soft: 'Soft fill',
}

export const SECONDARY_BUTTON_DESCRIPTIONS: Record<SecondaryButton, string> = {
  outline: 'A thin outline, as now.',
  soft: 'A light tint instead of an outline.',
}
