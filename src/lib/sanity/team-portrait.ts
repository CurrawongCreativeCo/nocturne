/**
 * Which picture design a Team section's portraits use, in one place so the Studio's controls and the
 * site's drawing can never disagree (README, "Image design"). Kept free of Studio code.
 *
 * - Grid and Slider draw larger portraits: always Image design (`FramedImage`).
 * - List draws small portraits: Portrait (`ProfileImage`), unless the section already has an Image
 *   design saved. That one keeps drawing, and stays visible so it can be inspected and cleared;
 *   Portrait is offered once it is cleared. Nothing saved is ever deleted or migrated.
 */

/** Whether a stored or queried `imageDesign` holds a choice (an object of nulls, or `{}`, holds none). */
export function hasImageDesign(design: unknown): boolean {
  if (!design || typeof design !== 'object') return false
  return Object.entries(design).some(
    ([key, value]) =>
      !key.startsWith('_') &&
      key !== 'customFrameUrl' &&
      value !== null &&
      value !== undefined &&
      value !== '',
  )
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
