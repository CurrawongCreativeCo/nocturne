/** Lowercase, no trailing slash: "/About-Us/" and "/about-us" are the same redirect source. */
export function normalizePath(path: string): string {
  return path.toLowerCase().replace(/(.)\/+$/, '$1')
}

/** The redirect whose source matches `path`, ignoring case and trailing slashes. */
export function findRedirect<T extends { source: string }>(redirects: T[], path: string): T | null {
  const target = normalizePath(path)
  return redirects.find(({ source }) => normalizePath(source) === target) ?? null
}

/** One entry of the Edge Config `redirects` map; short keys keep it under Edge Config's size limits. */
export interface EdgeRedirect {
  to: string
  status: 307 | 308
}

/** Edge Config item key holding the whole map, keyed by normalized source path. */
export const EDGE_REDIRECTS_KEY = 'redirects'

/**
 * The map proxy.ts reads from Edge Config. First rule wins on duplicate sources (as in
 * `findRedirect`); rules that would redirect a path to itself are dropped, since they'd loop.
 */
export function buildRedirectMap(
  redirects: { source: string; destination: string; permanent: boolean }[],
): Record<string, EdgeRedirect> {
  const map: Record<string, EdgeRedirect> = {}
  for (const { source, destination, permanent } of redirects) {
    const key = normalizePath(source)
    if (Object.hasOwn(map, key) || key === normalizePath(destination)) continue
    map[key] = { to: destination, status: permanent ? 308 : 307 }
  }
  return map
}

/** Own-property lookup, so a path like "/constructor" never matches `Object.prototype`. */
export function lookupRedirect(
  map: Record<string, EdgeRedirect> | null | undefined,
  path: string,
): EdgeRedirect | null {
  const key = normalizePath(path)
  return map && Object.hasOwn(map, key) ? (map[key] ?? null) : null
}
