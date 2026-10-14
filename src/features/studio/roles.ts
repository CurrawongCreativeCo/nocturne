/**
 * Studio roles: who counts as agency staff or a client editor, and which page sections clients
 * may add. The predicates live in src/lib/sanity/roles.ts so schema files can use them.
 */

export {
  audienceFor,
  currentAudience,
  isAgency,
  isClientEditor,
  isContributor,
  readClientViewPreview,
  writeClientViewPreview,
  type Audience,
} from '@/lib/sanity/roles'

/**
 * Sections clients may add when the site has no profile (or the profile lists none): Rich text,
 * Image + text, FAQ, Call to action banner and Testimonials.
 */
export const DEFAULT_CLIENT_SECTIONS: readonly string[] = [
  'richText',
  'mediaText',
  'faq',
  'ctaBanner',
  'testimonials',
]

/** Query for the site profile's allow-list (task 25). It resolves to null until that singleton exists. */
export const CLIENT_SECTIONS_QUERY = '*[_id == "siteProfile"][0].clientSections'

/** The profile's `clientSections` when it lists at least one section, else the default list. */
export function resolveClientSections(profileSections?: readonly unknown[] | null): Set<string> {
  const fromProfile = (profileSections ?? []).filter(
    (name): name is string => typeof name === 'string' && name.length > 0,
  )
  return new Set(fromProfile.length > 0 ? fromProfile : DEFAULT_CLIENT_SECTIONS)
}

/** Keeps the section types a client may add. Agency staff are not filtered by the caller. */
export function filterInsertableTypes<T extends { name: string }>(
  types: readonly T[],
  allowed: ReadonlySet<string>,
): T[] {
  return types.filter((type) => allowed.has(type.name))
}
