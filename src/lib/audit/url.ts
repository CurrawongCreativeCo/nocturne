/** URL comparison for the audit rules. Pure. */

/** Resolves `href` against `base`; null when it is not a URL. */
export function resolveUrl(href: string, base: string): URL | null {
  try {
    return new URL(href, base)
  } catch {
    return null
  }
}

/**
 * The address without its fragment, with the host in lower case and no trailing slash (the root
 * keeps its one). Two URLs a search engine would treat as the same page compare equal.
 */
export function normaliseUrl(url: string): string {
  const parsed = resolveUrl(url, 'https://invalid.example')
  if (!parsed) return url
  const path = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${path}${parsed.search}`
}

/** The path and query, for showing in a finding. */
export function pathOf(url: string): string {
  const parsed = resolveUrl(url, 'https://invalid.example')
  return parsed ? `${parsed.pathname}${parsed.search}` : url
}
