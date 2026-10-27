export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** IndexNow keys are 8-128 letters, digits and dashes. */
export const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/

/** The key file's public path. IndexNow looks for it at the site root by default. */
export function keyFilePath(key: string): string {
  return `/${key}.txt`
}

function isLocalhost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1'
  } catch {
    return true
  }
}

/**
 * The IndexNow request for one published URL, or null when there's nothing to send: no (valid)
 * key, no path, or a localhost site that search engines couldn't reach anyway. `path` is the
 * site-relative path ("/about", "/blog/hello"): build it with slugToPath or postPath.
 */
export function buildIndexNowRequest(options: {
  key: string | undefined
  siteUrl: string
  path: string | null | undefined
}): { url: string; body: string } | null {
  const { key, siteUrl, path } = options
  if (!key || !INDEXNOW_KEY_PATTERN.test(key) || !path || isLocalhost(siteUrl)) return null

  const origin = new URL(siteUrl)
  return {
    url: INDEXNOW_ENDPOINT,
    body: JSON.stringify({
      host: origin.host,
      key,
      keyLocation: new URL(keyFilePath(key), origin).toString(),
      urlList: [new URL(path, origin).toString()],
    }),
  }
}

/** Tells search engines a URL changed. Never throws: IndexNow must not fail a webhook. */
export async function pingIndexNow(request: { url: string; body: string }): Promise<void> {
  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: request.body,
      signal: AbortSignal.timeout(10_000),
    })
    // 200 and 202 both mean accepted (202: key validation pending).
    if (!response.ok) console.error(`IndexNow ping failed: HTTP ${response.status}`)
  } catch (error) {
    console.error('IndexNow ping failed', error)
  }
}

/**
 * Whether IndexNow can ping. It needs a valid key, and webhook mode: the ping happens in
 * `/api/revalidate`, which only runs when Sanity calls it.
 */
export function getIndexNowReadiness(env: Record<string, string | undefined> = process.env) {
  const missing: string[] = []
  const key = env.INDEXNOW_KEY
  if (!key) missing.push('INDEXNOW_KEY')
  else if (!INDEXNOW_KEY_PATTERN.test(key)) {
    missing.push('INDEXNOW_KEY (8 to 128 letters, digits and dashes)')
  }
  if (!env.SANITY_REVALIDATE_SECRET)
    missing.push('SANITY_REVALIDATE_SECRET (IndexNow needs webhook mode)')
  return missing.length > 0 ? { ready: false as const, missing } : { ready: true as const }
}
