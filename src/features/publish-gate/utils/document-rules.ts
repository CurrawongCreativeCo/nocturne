/**
 * What the publish gate knows about each document type that the field registry
 * (src/lib/sanity/client-editable.ts) does not: the fields the schema requires, which types keep
 * their slug unique, and the values protected fields start with. The Studio checks the same things
 * in the browser, but only the server decides, so the gate repeats them. src/app/publish-gate-rules.test.ts
 * compares this file with the real schema, so a change there fails until this file follows.
 */

/** Stored fields the schema marks required (`schema.json`, `optional: false`), by document type. */
export const REQUIRED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  page: ['title', 'slug'],
  post: ['title', 'slug', 'excerpt', 'mainImage', 'body', 'author', 'publishedAt'],
  author: ['name'],
  category: ['title', 'slug'],
  enquiry: ['status'],
  siteIdentity: ['title'],
  businessInfo: ['tradingName', 'timeZone'],
  teamMember: ['name', 'portrait'],
  event: ['title', 'slug', 'start', 'status'],
  service: ['name', 'slug', 'summary', 'image'],
  place: ['name', 'kind', 'slug'],
  eventCategory: ['title'],
  panel: ['title', 'content', 'presentation'],
}

/** Document types whose slug must differ from every other published document of the same type. */
export const UNIQUE_SLUG_TYPES: ReadonlySet<string> = new Set([
  'page',
  'post',
  'category',
  'event',
  'teamMember',
  'service',
  'place',
])

/** The `INITIAL_VALUES` key whose values apply to every type (the section fields all sections share). */
export const ANY_TYPE = '*'

/**
 * The values protected fields (outside the client-editable lists) get when Studio creates a new
 * document or section, by the type that holds the field. A new document or section whose protected
 * fields all equal these has not changed anything a client may not. Anything else, or any type or
 * field missing here, goes to review: the list fails safe. Compared ignoring `_type` and `_key`.
 */
export const INITIAL_VALUES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  [ANY_TYPE]: { access: 'public', style: { tone: 'surface' } },
  page: { minimalLayout: false },
  seo: { noIndex: false },
  siteIdentity: { allowAiCrawlers: true },
  siteNavigation: { footerShowSocial: false, footerSocialStyle: 'plain' },
  businessInfo: { businessType: 'LocalBusiness' },
  panel: { presentation: 'auto', width: 'medium', swipeToClose: true },
}

/** Types that have a public address a redirect can protect. Other slugs cannot change without review. */
export const REDIRECTABLE_TYPES: ReadonlySet<string> = new Set(['page', 'post'])
