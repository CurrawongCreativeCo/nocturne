/**
 * Pure logic behind the confirm-publish action: what address a document lives at, whether
 * publishing changes it, and the redirect to leave behind. No Studio imports, so it can be
 * unit tested; `actions/confirm-publish.tsx` does the reading and writing.
 */
import { postPath, slugToPath } from '@/config/paths'
import { normalizePath } from '@/lib/redirects'

import { findRedirectProblems, type RedirectRule } from '../content-health/utils/detect'

/** Document types the confirm-publish action covers: the ones with a public address. */
export const CONFIRMED_PUBLISH_TYPES = new Set(['page', 'post'])

/** The slug string of a page or post document, or null when it has none yet. */
export function readSlug(doc: unknown): string | null {
  if (typeof doc !== 'object' || doc === null || !('slug' in doc)) return null
  const slug = doc.slug
  if (typeof slug !== 'object' || slug === null || !('current' in slug)) return null
  return typeof slug.current === 'string' && slug.current !== '' ? slug.current : null
}

/** The site path of a page or post ("/about", "/blog/hello"); null for other types or an empty slug. */
export function documentPath(type: string, slug: string | null | undefined): string | null {
  if (!slug) return null
  if (type === 'page') return slugToPath(slug)
  if (type === 'post') return postPath(slug)
  return null
}

/** "https://example.com/" + "/about" -> "https://example.com/about". */
export function joinUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, '')
  return path === '/' ? `${base}/` : `${base}${path}`
}

export interface AddressChange {
  from: string
  to: string
}

/**
 * The address change a publish would cause, or null: no published version yet, no slug on either
 * side, or the same address (a case-only change is the same address, since redirects ignore case).
 */
export function detectAddressChange(
  type: string,
  publishedSlug: string | null,
  draftSlug: string | null,
): AddressChange | null {
  const from = documentPath(type, publishedSlug)
  const to = documentPath(type, draftSlug)
  if (!from || !to || normalizePath(from) === normalizePath(to)) return null
  return { from, to }
}

export type RedirectPlan =
  /** Safe to create. `chained` are redirects that already point at the old address and will take an extra hop. */
  | { kind: 'create'; chained: string[] }
  /** A redirect from the old address already exists. */
  | { kind: 'duplicate'; destination: string }
  /** The new redirect would send visitors round in circles. */
  | { kind: 'loop'; path: string[] }

const NEW_RULE_ID = 'new-redirect'

/** Applies the redirect document's rules (no duplicate source, no loop) to the new redirect. */
export function planRedirect(existing: RedirectRule[], change: AddressChange): RedirectPlan {
  const source = normalizePath(change.from)
  const duplicate = existing.find((rule) => normalizePath(rule.source) === source)
  if (duplicate) return { kind: 'duplicate', destination: duplicate.destination }

  const rule: RedirectRule = { id: NEW_RULE_ID, source: change.from, destination: change.to }
  const loop = findRedirectProblems([...existing, rule]).find(
    ({ id, kind, path }) =>
      id === NEW_RULE_ID && kind === 'loop' && normalizePath(path.at(-1) ?? '') === source,
  )
  if (loop) return { kind: 'loop', path: loop.path }

  return {
    kind: 'create',
    chained: existing
      .filter(({ destination }) => normalizePath(destination) === source)
      .map(({ source: from }) => from),
  }
}

/** The redirect document to publish: old address -> new address, permanent (308). */
export function buildRedirectDocument({ from, to }: AddressChange) {
  return { _type: 'redirect' as const, source: from, destination: to, permanent: true }
}
