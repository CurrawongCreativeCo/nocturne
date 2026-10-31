import { createIfNotExists, defineMigration } from 'sanity/migrate'

type Fields = Record<string, unknown>

/** Self-contained on purpose: the Sanity CLI bundles a migration by itself, so it imports nothing from src. */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The id a service area gets: derived from its name, so a second run finds the document it made the
 * first time. Renaming the area later does not change it.
 */
export const serviceAreaId = (slug: string) => `place-area-${slug}`

/** What is already in the dataset that a new service area could collide with. */
export interface Existing {
  /** `place` documents: `_id` (any `drafts.` prefix removed) and page address. */
  places: readonly { _id: string; slug?: string | null }[]
  /** Page addresses of published `page` documents. */
  pageSlugs: readonly string[]
}

export interface ServiceAreaPlan {
  creates: {
    _id: string
    _type: 'place'
    name: string
    kind: 'serviceArea'
    slug: { _type: 'slug'; current: string }
  }[]
  /** Nothing to do, and nothing wrong: already migrated, a repeat, or not a usable name. */
  skips: { name: string; reason: string }[]
  /** Not created, because a person has to decide: the name is taken by something else. */
  conflicts: { name: string; slug: string; reason: string }[]
}

/**
 * Plans the service-area locations for Business info's `serviceAreas` strings, touching nothing.
 *
 * - **Identity:** one per distinct normalised name (spacing tidied, accents and case folded into the
 *   page address), with the id `place-area-<page address>`, so the same strings always give the same
 *   ids and a repeat run finds what the first made.
 * - **Skipped:** a name whose id exists already (migrated before), a repeat of an earlier name, and
 *   blank or unusable ones ("!!!", numbers). Each is reported with its reason.
 * - **Conflicts, never created:** a page address a *different* `place` already uses (a manually made
 *   location is never overwritten or duplicated), or a published page at `locations/<address>` that
 *   the new location's route would shadow.
 * - Only the published Business info is read. No service or team member is ever linked: which services
 *   an area serves is a decision for the business, not something a string can say.
 */
export function planServiceAreas(
  doc: Fields & { _id: string },
  existing: Existing = { places: [], pageSlugs: [] },
): ServiceAreaPlan {
  const plan: ServiceAreaPlan = { creates: [], skips: [], conflicts: [] }
  if (doc._id !== 'businessInfo' || !Array.isArray(doc.serviceAreas)) return plan

  const ids = new Set(existing.places.map(({ _id }) => _id))
  const pages = new Set(existing.pageSlugs)
  const seen = new Set<string>()
  for (const area of doc.serviceAreas as unknown[]) {
    if (typeof area !== 'string') {
      plan.skips.push({ name: String(area), reason: 'not text' })
      continue
    }
    const name = area.trim().replace(/\s+/g, ' ')
    const slug = slugify(name)
    if (!slug) {
      plan.skips.push({ name, reason: 'empty or has no letters or numbers to make a page address' })
      continue
    }
    if (seen.has(slug)) {
      plan.skips.push({ name, reason: `repeats an earlier name (same page address "${slug}")` })
      continue
    }
    seen.add(slug)
    const _id = serviceAreaId(slug)
    if (ids.has(_id)) {
      plan.skips.push({ name, reason: `already migrated (${_id} exists; it is left as it is)` })
      continue
    }
    const taken = existing.places.find((place) => place.slug === slug)
    if (taken) {
      plan.conflicts.push({
        name,
        slug,
        reason: `the page address /locations/${slug} is already used by ${taken._id}; link or rename that location by hand`,
      })
      continue
    }
    if (pages.has(`locations/${slug}`)) {
      plan.conflicts.push({
        name,
        slug,
        reason: `a published page is already at /locations/${slug}; rename and redirect it first (npm run check:location-routes)`,
      })
      continue
    }
    plan.creates.push({
      _id,
      _type: 'place',
      name,
      kind: 'serviceArea',
      slug: { _type: 'slug', current: slug },
    })
  }
  return plan
}

/** The plan as the lines a dry run prints: what would be created, skipped and left for a person. */
export function describePlan(plan: ServiceAreaPlan): string[] {
  return [
    `service areas -> locations: ${plan.creates.length} to create, ${plan.skips.length} skipped, ${plan.conflicts.length} conflicts`,
    ...plan.creates.map(({ _id, name }) => `  create   ${_id}  ("${name}")`),
    ...plan.skips.map(({ name, reason }) => `  skip     "${name}": ${reason}`),
    ...plan.conflicts.map(({ name, reason }) => `  CONFLICT "${name}": ${reason}`),
  ]
}

/**
 * Turns each of Business info's `serviceAreas` strings into a service-area location (the `place`
 * document type, titled "Location" in Studio), so an area can have its own page and be named in a
 * service's structured data. The strings stay in Business info, untouched: nothing reads them for a
 * page, and a business with locations can clear the field by hand once it has checked the new ones
 * (README, "Locations").
 *
 * The dry run (the default) prints every document it would create, skip and leave as a conflict, and writes nothing. Safe to run
 * twice: `createIfNotExists` never overwrites a location that exists, so edits made in Studio since
 * the first run are kept. Enable the `locations` flag afterwards, and run `npm run
 * check:location-routes` first so no page at `locations/<name>` is shadowed.
 */
export default defineMigration({
  title: 'Turn Business info service areas into service-area locations',
  documentTypes: ['businessInfo'],
  migrate: {
    async document(doc, context) {
      if (doc._id !== 'businessInfo') return []
      // Read-only lookups (the dry run makes them too): what the new locations could collide with.
      const client = context.client.withConfig({ perspective: 'raw' })
      const [places, pageSlugs] = await Promise.all([
        client.fetch<{ _id: string; slug?: string | null }[]>(
          '*[_type == "place"]{ "_id": string::split(_id, "drafts.")[-1], "slug": slug.current }',
        ),
        client.fetch<string[]>('*[_type == "page" && defined(slug.current)].slug.current'),
      ])
      const plan = planServiceAreas(doc, { places, pageSlugs })
      for (const line of describePlan(plan)) console.warn(line)
      return plan.creates.length > 0 ? plan.creates.map((next) => createIfNotExists(next)) : []
    },
  },
})
