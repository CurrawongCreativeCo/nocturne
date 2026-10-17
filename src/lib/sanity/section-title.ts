import { stegaClean } from 'next-sanity'

interface TitleSource {
  /** The old plain-text title, read until the "Section titles to heading text" migration has run. */
  title?: string | null
  /** `pt::text(heading)`. */
  headingPlain?: string | null
}

/**
 * A section's title as plain text, or undefined when it has none: the words of its `heading` first,
 * else the old `title`. For "does it have a title?", labels and accessible names; the visible heading is
 * drawn by `<RichHeading blocks={data.heading} fallback={title}>`.
 */
export function sectionTitle({ title, headingPlain }: TitleSource): string | undefined {
  const plain = stegaClean(headingPlain)?.trim()
  return plain ? plain : (title ?? undefined) || undefined
}
