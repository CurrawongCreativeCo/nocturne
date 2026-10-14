/**
 * The values of a section's shared `style` (schema: schema/section-style.ts). Kept apart from the
 * schema because the site imports them too, and the schema file pulls in the whole Studio package.
 */

export const SECTION_TONES = ['surface', 'alt', 'inverse', 'accent'] as const
export const SECTION_SPACINGS = ['compact', 'default', 'spacious'] as const
export const SECTION_WIDTHS = ['narrow', 'default', 'wide', 'full'] as const
export const SECTION_ALIGNS = ['start', 'center'] as const
export const SECTION_MOTIONS = ['none', 'reveal', 'stagger', 'parallax'] as const

/** Ids the site itself uses (the skip link's target), so an anchor can't collide with them. */
export const RESERVED_ANCHORS: readonly string[] = ['main-content']

export const ANCHOR_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
