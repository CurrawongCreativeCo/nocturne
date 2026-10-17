import type { Audience } from '../roles'

/**
 * Desk items clients see, by item id. Allow-list on purpose: a document type added later stays
 * agency-only until it is added here. Ids with no matching item (Team, Business info on sites
 * that don't have them) are simply never shown.
 */
export const CLIENT_STRUCTURE_IDS: ReadonlySet<string> = new Set([
  'startHere',
  'pages',
  'blog',
  'reusable',
  'websiteSettings',
  'team',
  'businessInfo',
])

/**
 * What clients see inside Reusable content: the panels' content, which they edit. Shared sections
 * and forms stay with the agency.
 */
export const CLIENT_REUSABLE_IDS: ReadonlySet<string> = new Set(['panel'])

/**
 * What clients see inside Website settings: the cookie banner (legal wording) stays with the
 * agency, as do any screens added later.
 */
export const CLIENT_WEBSITE_SETTINGS_IDS: ReadonlySet<string> = new Set([
  'siteIdentity',
  'siteNavigation',
  'announcement',
])

/**
 * Filters desk items for the audience, keeping the ids in `allowed` (the top-level list by default).
 * `idOf` returns an item's id, or null for a divider. Dividers are kept between groups but never
 * lead, trail or double up once items are removed.
 */
export function filterStructureItems<T>(
  items: readonly T[],
  audience: Audience,
  idOf: (item: T) => string | null | undefined,
  allowed: ReadonlySet<string> = CLIENT_STRUCTURE_IDS,
): T[] {
  if (audience === 'agency') return [...items]
  const kept = items.filter((item) => {
    const id = idOf(item)
    return id === null || (id !== undefined && allowed.has(id))
  })
  return kept.filter((item, index) => {
    if (idOf(item) !== null) return true
    const previous = kept[index - 1]
    return index > 0 && index < kept.length - 1 && previous !== undefined && idOf(previous) !== null
  })
}
