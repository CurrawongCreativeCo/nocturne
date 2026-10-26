/**
 * Where a page or post lives and whether publishing moves it. Shared by the Studio's confirm-publish
 * action and the publish gate (`POST /api/publish`), which both need the same answer. No Studio
 * imports, so it can be unit tested.
 */
import { postPath, slugToPath } from '@/config/paths'
import { normalizePath } from '@/lib/redirects'

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
