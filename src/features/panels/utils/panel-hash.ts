/** A panel's deep link is `#panel-<slug>`. */
const PREFIX = '#panel-'

interface Location {
  pathname: string
  search: string
  hash: string
}

export const panelHash = (slug: string) => `${PREFIX}${slug}`

/** The slug a hash asks for, if it is one of this page's panels. Hashes are case-sensitive, so is this. */
export function slugFromHash(hash: string, slugs: readonly string[]): string | null {
  if (!hash.startsWith(PREFIX)) return null
  let wanted = hash.slice(PREFIX.length)
  try {
    wanted = decodeURIComponent(wanted)
  } catch {
    // A malformed escape can't match a slug.
    return null
  }
  return slugs.includes(wanted) ? wanted : null
}

/** The address while a panel is open: the page, plus the panel's hash. */
export function addressWithPanel({ pathname, search }: Location, slug: string): string {
  return `${pathname}${search}${panelHash(slug)}`
}

/**
 * The address to go back to when a panel closes. A panel's own hash is dropped, so closing a panel
 * that was opened by a shared link doesn't leave the link in the bar; any other hash (a section
 * anchor the visitor was at) stays.
 */
export function addressWithoutPanel({ pathname, search, hash }: Location): string {
  return `${pathname}${search}${hash.startsWith(PREFIX) ? '' : hash}`
}
