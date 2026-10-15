import { createIfNotExists, defineMigration } from 'sanity/migrate'

type Fields = Record<string, unknown>

/**
 * Where each part of the old `settings` document goes. `from` is the field holding the part when
 * it was a nested object (announcement, consent): its own fields become the new document's
 * top-level fields. Without `from`, the listed top-level fields are copied across.
 */
const TARGETS: readonly { id: string; fields?: readonly string[]; from?: string }[] = [
  {
    id: 'siteIdentity',
    fields: ['title', 'description', 'logo', 'ogImage', 'browserIcon', 'allowAiCrawlers'],
  },
  { id: 'siteNavigation', fields: ['headerNav', 'headerCta', 'footerNav', 'footerText'] },
  { id: 'announcement', from: 'announcement' },
  { id: 'cookieBanner', from: 'consent' },
]

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The documents to create from one `settings` document (published, or `drafts.`): one per part
 * that has content, with the same draft prefix, so unpublished edits carry over too. Release
 * versions (`versions.<release>.settings`) are left alone.
 */
export function splitSettings(doc: Fields & { _id: string }): { _id: string; _type: string }[] {
  if (doc._id.startsWith('versions.')) return []
  const prefix = doc._id.startsWith('drafts.') ? 'drafts.' : ''

  return TARGETS.flatMap(({ id, fields, from }) => {
    const source = from ? doc[from] : doc
    if (!isObject(source)) return []
    const names = fields ?? Object.keys(source).filter((name) => !name.startsWith('_'))
    const copied = Object.fromEntries(
      names.flatMap((name) => (source[name] == null ? [] : [[name, source[name]]])),
    )
    return Object.keys(copied).length > 0 ? [{ _id: `${prefix}${id}`, _type: id, ...copied }] : []
  })
}

/**
 * Splits Site settings into four focused documents: Identity & search (`siteIdentity`),
 * Navigation (`siteNavigation`), Announcement bar (`announcement`) and Cookie banner
 * (`cookieBanner`). The old `settings` document is kept, untouched, as a backup: nothing reads it
 * once the new documents exist, so delete it by hand when you are happy.
 *
 * Safe to run twice: `createIfNotExists` never overwrites a document that already exists, so
 * edits made in the new screens since the first run are kept.
 */
export default defineMigration({
  title: 'Split Site settings into Identity, Navigation, Announcement and Cookie banner',
  documentTypes: ['settings'],
  migrate: {
    document(doc) {
      const created = splitSettings(doc)
      return created.length > 0 ? created.map((next) => createIfNotExists(next)) : undefined
    },
  },
})
