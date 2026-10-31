import { at, defineMigration, set } from 'sanity/migrate'

type Fields = Record<string, unknown>

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Where Image + text sections live: the array field of each document type that holds them. Self-contained on purpose: the Sanity CLI bundles a migration by itself, so it imports nothing from src. */
const SECTION_ARRAYS: Readonly<Record<string, string>> = {
  page: 'pageBuilder',
  sharedSection: 'section',
}

/** An Image + text section with a picture in `image` and nothing in `media` yet. An empty `media` array counts as none. */
function needsMedia(section: unknown): section is Fields & { _key: string; image: Fields } {
  if (!isObject(section) || section._type !== 'mediaText') return false
  if (typeof section._key !== 'string' || !isObject(section.image)) return false
  if (!section.image.asset) return false
  return !Array.isArray(section.media) || section.media.length === 0
}

/**
 * The patches that put each Image + text picture into the `media` slot, as one `slotImage` block.
 * The `image` field stays put (the code reads `media` first and falls back to `image`), so nothing is
 * lost and a dry run shows exactly what would be added. The block's key comes from the section's key,
 * which is what makes running it again change nothing.
 */
export function imageToMediaPatches(doc: Fields) {
  const field = SECTION_ARRAYS[String(doc._type)]
  const sections = field ? doc[field] : undefined
  if (!field || !Array.isArray(sections)) return []
  return sections
    .filter(needsMedia)
    .map((section) =>
      at(
        [field, { _key: section._key }, 'media'],
        set([{ _key: `${section._key}-media`, _type: 'slotImage', image: section.image }]),
      ),
    )
}

/**
 * Moves every Image + text section's `image` into its `media` slot, the place that also takes a
 * video. Existing pages render the same before and after: the picture, its alt text, crop and
 * hotspot are copied as they are, and the section's Image design and layout are untouched. Run it on
 * every dataset, then remove the old `image` field in a later release (README, "Image + text").
 *
 * Safe to run twice: sections that already have media are skipped. It covers published documents,
 * drafts and release versions alike, and shared sections.
 */
export default defineMigration({
  title: 'Move Image + text pictures into the media slot',
  documentTypes: Object.keys(SECTION_ARRAYS),
  migrate: {
    document(doc) {
      const patches = imageToMediaPatches(doc)
      return patches.length > 0 ? patches : undefined
    },
  },
})
