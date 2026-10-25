import { PUBLISHED } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'

/**
 * The launch verification marker: `<meta name="nocturne:marker">`, so `launch:check --expect-marker`
 * can prove CMS content reached the page. Nothing when the field is empty. Reuses the cached published
 * settings entry (no extra request) and ships no client JavaScript.
 */
export async function SiteMarker() {
  const settings = await getSettings(PUBLISHED)
  const marker = settings?.verificationMarker?.trim()
  if (!marker) return null
  return <meta name="nocturne:marker" content={marker} />
}
