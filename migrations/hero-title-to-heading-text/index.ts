import { at, defineMigration, set } from 'sanity/migrate'

type Fields = Record<string, unknown>

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Self-contained on purpose: the Sanity CLI bundles a migration by itself, so it imports nothing from src. */
const headingBlock = (text: string, key: string) => ({
  _key: `${key}-heading`,
  _type: 'block',
  style: 'normal',
  markDefs: [],
  children: [{ _key: `${key}-heading-span`, _type: 'span', text, marks: [] }],
})

/** Where hero sections live: the array field of each document type that holds them. */
const SECTION_ARRAYS: Readonly<Record<string, string>> = {
  page: 'pageBuilder',
  sharedSection: 'section',
}

/** A hero with a plain `title` and no `heading` yet. An empty `heading` array counts as none. */
function needsHeading(section: unknown): section is Fields & { _key: string; title: string } {
  if (!isObject(section) || section._type !== 'hero') return false
  if (typeof section._key !== 'string' || typeof section.title !== 'string') return false
  if (section.title.trim() === '') return false
  return !Array.isArray(section.heading) || section.heading.length === 0
}

/**
 * The patches that give each hero a `heading` block holding its old `title`. The string stays put
 * (the code reads `heading` first and falls back to `title`), and the block's keys come from the
 * section's key, so running it again changes nothing.
 */
export function heroHeadingPatches(doc: Fields) {
  const field = SECTION_ARRAYS[String(doc._type)]
  const sections = field ? doc[field] : undefined
  if (!field || !Array.isArray(sections)) return []
  return sections
    .filter(needsHeading)
    .map((section) =>
      at(
        [field, { _key: section._key }, 'heading'],
        set([headingBlock(section.title, section._key)]),
      ),
    )
}

/**
 * Converts every hero's plain `title` into the `heading` Portable Text field, the one editors
 * highlight words in. Run it on every dataset, then remove the old `title` field in a later release
 * (README, "Highlighting words in a heading").
 *
 * Safe to run twice: heroes that already have a heading are skipped. It covers published documents,
 * drafts and release versions alike, and shared sections.
 */
export default defineMigration({
  title: 'Convert hero titles to heading text',
  documentTypes: Object.keys(SECTION_ARRAYS),
  migrate: {
    document(doc) {
      const patches = heroHeadingPatches(doc)
      return patches.length > 0 ? patches : undefined
    },
  },
})
