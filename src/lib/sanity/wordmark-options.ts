import { stegaClean } from 'next-sanity'

/**
 * Text drawn as a picture: a client's wordmark or hand-lettered name in place of a heading's text
 * (components/ui/wordmark.tsx). The text stays in the content and becomes the picture's alt text, so
 * the heading keeps its name for screen readers and search engines. Offered only where a brand
 * moment is the point (the Link list's name and heading); text is the default everywhere.
 * Kept free of Studio code so the site can import it.
 */
export const TEXT_DISPLAYS = ['text', 'image'] as const
export type TextDisplay = (typeof TEXT_DISPLAYS)[number]

export const WORDMARK_SIZES = ['small', 'medium', 'large'] as const
export type WordmarkSize = (typeof WORDMARK_SIZES)[number]
export const WORDMARK_SIZE_TITLES: Record<WordmarkSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export const wordmarkSizeOf = (value: string | null | undefined): WordmarkSize =>
  WORDMARK_SIZES.find((option) => option === stegaClean(value)) ?? 'medium'

/** Whether to draw the picture: Image chosen and a picture uploaded; otherwise the text shows. */
export function showsWordmark(
  display: string | null | undefined,
  image: { asset?: unknown } | null | undefined,
): boolean {
  return stegaClean(display) === 'image' && Boolean(image?.asset)
}
