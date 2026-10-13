const ORIGIN = 'http://site.invalid'

/**
 * A path on this site from a value a visitor controls (the `callbackUrl` of a sign-in link), or
 * `fallback`. Anything that points elsewhere ("https://evil.example", "//evil.example",
 * "/\evil.example") is dropped, so sign-in can't be used as an open redirect.
 */
export function safePath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  try {
    const url = new URL(value, ORIGIN)
    return url.origin === ORIGIN ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
