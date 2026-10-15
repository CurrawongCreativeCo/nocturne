/**
 * Content health detection. Pure functions over plain document data, with no Studio imports,
 * so they can be unit tested. `build-report.ts` feeds them the Studio's query result.
 */
import { HOME_SLUG } from '@/config/paths'
import { normalizePath } from '@/lib/redirects'

const DRAFT_PREFIX = 'drafts.'

export interface Versioned<T> {
  /** The published id, which is what intents and references use. */
  id: string
  /** The draft when there is one (what editors are working on), otherwise the published document. */
  doc: T
  /** Whether a published version exists, i.e. whether the live site can see it. */
  published: boolean
}

/** Collapses a raw-perspective list (drafts and published side by side) to one entry per document. */
export function resolveVersions<T extends { _id: string }>(docs: T[]): Versioned<T>[] {
  const byId = new Map<string, { draft?: T; published?: T }>()
  for (const doc of docs) {
    const isDraft = doc._id.startsWith(DRAFT_PREFIX)
    const id = isDraft ? doc._id.slice(DRAFT_PREFIX.length) : doc._id
    byId.set(id, { ...byId.get(id), [isDraft ? 'draft' : 'published']: doc })
  }
  return [...byId].flatMap(([id, { draft, published }]) => {
    const doc = draft ?? published
    return doc ? [{ id, doc, published: published !== undefined }] : []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// -- Links ------------------------------------------------------------------------------------

/**
 * Ids of the pages that `link` objects point at, anywhere inside `value` (CTAs, menus, rich text
 * link annotations). A link whose type was switched to external can still hold an old
 * reference, so only `linkType: "internal"` counts.
 */
export function collectLinkTargets(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectLinkTargets)
  if (!isRecord(value)) return []
  if (value._type === 'link') {
    const ref = isRecord(value.internal) ? value.internal._ref : undefined
    return value.linkType === 'internal' && typeof ref === 'string' ? [ref] : []
  }
  return Object.values(value).flatMap(collectLinkTargets)
}

/** Distinct link targets with no published page behind them (never published, or deleted). */
export function findBrokenLinkTargets(value: unknown, publishedIds: ReadonlySet<string>): string[] {
  return [...new Set(collectLinkTargets(value))].filter((id) => !publishedIds.has(id))
}

/** Ids of the shared sections referenced in a page builder array. */
export function collectSharedSectionIds(sections: unknown): string[] {
  if (!Array.isArray(sections)) return []
  return sections.filter(isRecord).flatMap((section) => {
    const ref = section._type === 'reference' ? section._ref : undefined
    return typeof ref === 'string' ? [ref] : []
  })
}

// -- Images -----------------------------------------------------------------------------------

function isMissingAlt(image: unknown): boolean {
  if (!isRecord(image) || !isRecord(image.asset)) return false
  return typeof image.alt !== 'string' || image.alt.trim() === ''
}

/** Images that are direct members of an array: the inline images of Portable Text. */
function portableTextImages(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((member) =>
      isRecord(member) && member._type === 'image' ? [member] : portableTextImages(member),
    )
  }
  return isRecord(value) ? Object.values(value).flatMap(portableTextImages) : []
}

/**
 * Labels of the images in page-builder sections that have an asset but no alt text. Covers the hero
 * background, Image + text image, testimonial avatars and images inside any rich text. Site
 * settings are not scanned: the logo is decorative (the header announces the site name).
 */
export function findImagesWithoutAlt(sections: unknown): string[] {
  if (!Array.isArray(sections)) return []
  return sections.filter(isRecord).flatMap((section): string[] => {
    const labelled: [string, unknown][] = []
    if (section._type === 'hero') labelled.push(['Hero background image', section.backgroundImage])
    if (section._type === 'mediaText') labelled.push(['Image + text image', section.image])
    if (section._type === 'testimonials' && Array.isArray(section.items)) {
      for (const item of section.items.filter(isRecord)) {
        labelled.push(['Testimonial photo', item.avatar])
      }
    }
    for (const image of portableTextImages(section)) labelled.push(['Rich text image', image])
    return labelled.filter(([, image]) => isMissingAlt(image)).map(([label]) => label)
  })
}

// -- Redirects --------------------------------------------------------------------------------

export interface RedirectRule {
  id: string
  source: string
  destination: string
}

export interface RedirectProblem {
  id: string
  kind: 'chain' | 'loop'
  /** Every path visited, ending at the final destination (or at the path that repeats, in a loop). */
  path: string[]
}

/**
 * Chains (a destination that is another redirect's source, so visitors take extra hops) and loops
 * (the hops lead back to a path already visited). Every redirect that starts one is reported,
 * so a two-redirect loop yields two problems. Paths match like the site does: ignoring case and
 * trailing slashes. External destinations end a chain.
 */
export function findRedirectProblems(rules: RedirectRule[]): RedirectProblem[] {
  const bySource = new Map<string, RedirectRule>()
  for (const rule of rules) {
    // Like findRedirect, the first rule for a path wins.
    const key = normalizePath(rule.source)
    if (!bySource.has(key)) bySource.set(key, rule)
  }

  return rules.flatMap((start): RedirectProblem[] => {
    const seen = new Set([normalizePath(start.source)])
    // A redirect shadowed by an earlier one with the same source never applies.
    if (bySource.get(normalizePath(start.source)) !== start) return []
    const path = [start.source]
    let current = start
    for (;;) {
      path.push(current.destination)
      if (!current.destination.startsWith('/')) break
      const key = normalizePath(current.destination)
      const next = bySource.get(key)
      if (seen.has(key)) return [{ id: start.id, kind: 'loop', path }]
      if (!next) break
      seen.add(key)
      current = next
    }
    return path.length > 2 ? [{ id: start.id, kind: 'chain', path }] : []
  })
}

// -- Orphans ----------------------------------------------------------------------------------

export interface PageLink {
  /** The document holding the link: a page id, or "siteNavigation". */
  from: string
  /** The page it points at. */
  to: string
}

/**
 * Pages nothing links to. A page linking to itself doesn't count, and the home page is never
 * an orphan (it is "/", reached without a link).
 */
export function findOrphanPages<P extends { id: string; slug: string | null }>(
  pages: P[],
  links: PageLink[],
): P[] {
  const linked = new Set(links.filter(({ from, to }) => from !== to).map(({ to }) => to))
  return pages.filter(({ id, slug }) => slug !== HOME_SLUG && !linked.has(id))
}
