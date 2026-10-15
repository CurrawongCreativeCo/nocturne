/**
 * The values of a section's shared `style` (schema: schema/section-style.ts). Kept apart from the
 * schema because the site imports them too, and the schema file pulls in the whole Studio package.
 */

export const SECTION_TONES = ['surface', 'alt', 'inverse', 'accent'] as const
export const SECTION_SPACINGS = ['compact', 'default', 'spacious'] as const
export const SECTION_WIDTHS = ['narrow', 'default', 'wide', 'full'] as const
export const SECTION_ALIGNS = ['start', 'center'] as const
export const SECTION_MOTIONS = ['none', 'reveal', 'stagger', 'parallax'] as const

/** What editors call each tone: in the Background picker and in list previews ("Hero · Split · Dark"). */
export const SECTION_TONE_TITLES: Record<(typeof SECTION_TONES)[number], string> = {
  surface: 'Surface',
  alt: 'Soft',
  inverse: 'Dark',
  accent: 'Accent',
}

/** How strongly the tone's colour covers a background image, so the text on it stays readable. */
export const SECTION_OVERLAYS = ['none', 'light', 'medium', 'strong'] as const

export const SECTION_OVERLAY_TITLES: Record<(typeof SECTION_OVERLAYS)[number], string> = {
  none: 'None',
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
}

/** The opacity of the tone-coloured layer over the image: what the page draws and the contrast check measures. */
export const SECTION_OVERLAY_OPACITY: Record<(typeof SECTION_OVERLAYS)[number], number> = {
  none: 0,
  light: 0.45,
  medium: 0.7,
  strong: 0.88,
}

/**
 * The overlay an image gets when none is chosen: Medium on the dark tones, where a bright photo
 * would swallow the light text, and Light on the others.
 */
export function defaultOverlayFor(tone: string | null | undefined): 'light' | 'medium' {
  return tone === 'inverse' || tone === 'accent' ? 'medium' : 'light'
}

/** Ids the site itself uses (the skip link's target), so an anchor can't collide with them. */
export const RESERVED_ANCHORS: readonly string[] = ['main-content']

export const ANCHOR_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
