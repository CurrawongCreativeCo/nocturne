/** Lines the share image's title may take before it's cut off with an ellipsis. */
export const OG_TITLE_MAX_LINES = 3

/**
 * Font size (px) for a title on the 1200x630 share image: big for short titles, smaller as they
 * grow so most fit in three lines without being cut off. Longer ones are clamped by the layout.
 */
export function ogTitleFontSize(title: string): number {
  const length = title.trim().length
  if (length <= 40) return 88
  if (length <= 80) return 72
  if (length <= 120) return 60
  return 52
}
