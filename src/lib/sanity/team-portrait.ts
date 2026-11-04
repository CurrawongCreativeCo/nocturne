/**
 * Which picture design a Team section's portraits use, in one place so the Studio's controls and the
 * site's drawing can never disagree (README, "Image design"). Kept free of Studio code.
 *
 * - Grid and Slider draw larger portraits: always Image design (`FramedImage`).
 * - List draws small portraits: Portrait (`ProfileImage`), unless the section already has an Image
 *   design saved. That one keeps drawing, and stays visible so it can be inspected and cleared;
 *   Portrait is offered once it is cleared. Nothing saved is ever deleted or migrated.
 */

/**
 * Whether a stored or queried `imageDesign` holds a choice. An object of nulls or `{}` holds none, and
 * neither does `custom: false`: "Set exact motion values" has an initial value of false, so Studio writes
 * it as soon as the object is touched and it stays after every real choice is cleared. The site acts
 * only on `custom: true`, so false changes nothing.
 */
export function hasImageDesign(design: unknown): boolean {
  if (!design || typeof design !== 'object') return false
  return Object.entries(design).some(
    ([key, value]) =>
      !key.startsWith('_') &&
      key !== 'customFrameUrl' &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      value !== false,
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
