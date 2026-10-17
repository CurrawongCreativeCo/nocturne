/** The stored `imagePosition` values with the names editors read, in the order the radio shows them. */
export const IMAGE_SIDE_TITLES: Record<string, string> = {
  left: 'Image left',
  right: 'Image right',
}

/** The radio options for an `imagePosition` field: titled, so the Studio never shows the raw value. */
export const imageSideOptions = {
  list: Object.entries(IMAGE_SIDE_TITLES).map(([value, title]) => ({ title, value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
}
