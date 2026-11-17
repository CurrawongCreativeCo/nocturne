import { imageAppearance, movesPicture } from './image-design-options'

/**
 * Which picture design a Team section's portraits use, in one place so the Studio's controls and the
 * site's drawing can never disagree (README, "Image design"). Kept free of Studio code.
 *
 * - Grid and Slider draw larger portraits: always Image design (`FramedImage`).
 * - List draws small portraits: Portrait (`ProfileImage`), unless the section has an Image design
 *   that changes how its portraits look. That one keeps drawing, and stays visible so it can be
 *   inspected and changed; Portrait is offered once it no longer changes anything. Nothing saved is
 *   ever deleted, unset or migrated: a design that stops counting is only ignored.
 */

/** The object `imageDesign` as stored or queried (a query returns nulls for what is unset). */
interface StoredImageDesign {
  appearance?: unknown
  motion?: unknown
  frame?: unknown
}

/**
 * Whether a stored or queried `imageDesign` is an effective choice: one that would draw a Team List
 * portrait differently from the list's own default (Standard corners, no frame, no motion). It is
 * not when it is:
 *
 * - empty, `{}`, or an object of nulls (a query's projection of nothing);
 * - neutral: Standard, Framed with no frame, and motion None draw what the default draws;
 * - an inactive leftover: a frame, its colour or inset on anything but Framed, or Custom, travel,
 *   direction or scale on anything but a moving picture (`custom: false` is Studio's initial value
 *   and stays after every choice is cleared). The site ignores these (`resolveImageDesign`).
 *
 * Effective: Rounded, Square corners, Circle or Arch; Framed with a frame (a preset, an approved one,
 * or none chosen, which draws the Simple line); Subtle or Medium parallax. An unknown value counts as
 * none, as the site treats it.
 */
export function hasImageDesign(design: unknown): boolean {
  if (!design || typeof design !== 'object') return false
  const { appearance: stored, motion, frame } = design as StoredImageDesign
  const appearance = imageAppearance(typeof stored === 'string' ? stored : undefined)
  if (movesPicture(typeof motion === 'string' ? motion : undefined)) return true
  if (appearance === 'framed') return frame !== 'none'
  return appearance !== undefined && appearance !== 'standard'
}

export interface TeamPortraitControls {
  /** Show Design › Image design. */
  imageDesign: boolean
  /** Show Design › Portrait. */
  portrait: boolean
}

export function teamPortraitControls(section: {
  variant?: string | null
  imageDesign?: unknown
}): TeamPortraitControls {
  if (section.variant !== 'list') return { imageDesign: true, portrait: false }
  const legacy = hasImageDesign(section.imageDesign)
  return { imageDesign: legacy, portrait: !legacy }
}

/**
 * The note shown beside Image shape on a Team List that still has an effective Image design, or null
 * where it would be wrong (Grid, Slider, or a List with nothing effective: Portrait is shown there).
 * Setting Standard and None is what makes a design neutral, whatever else is stored.
 */
export const PORTRAIT_NOTICE =
  'This list still uses an Image design, so Portrait (size and ring for the small pictures) is hidden. To use Portrait instead, set Image shape to Standard and Picture motion to None. Your other saved Image design settings are kept.'

export function portraitNotice(section: {
  variant?: string | null
  imageDesign?: unknown
}): string | null {
  return section.variant === 'list' && hasImageDesign(section.imageDesign) ? PORTRAIT_NOTICE : null
}
