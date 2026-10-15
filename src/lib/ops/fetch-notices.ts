import 'server-only'

import { noticesEndpoint, parseNotices, type Env, type OpsNotice } from './notices'

/**
 * Asks the Ops dashboard for this site's notices. The key (OPS_NOTICES_KEY, optional) is sent as a
 * bearer token from here, so it never reaches the browser. Returns null when notices are not set
 * up, and an empty list when the dashboard is down: a failure must never break the Studio.
 */
export async function fetchNotices(
  siteSlug: string,
  env: Env = process.env,
): Promise<OpsNotice[] | null> {
  const endpoint = noticesEndpoint(env)
  if (!endpoint) return null
  endpoint.searchParams.set('site', siteSlug)

  const key = env.OPS_NOTICES_KEY?.trim()
  try {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    })
    if (!response.ok) return []
    return parseNotices(await response.json())
  } catch (error) {
    console.error('Ops notices request failed', error instanceof Error ? error.message : error)
    return []
  }
}
