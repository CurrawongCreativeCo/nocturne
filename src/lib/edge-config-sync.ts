import 'server-only'

import { canSyncRedirectsFrom, edgeConfigIdFrom } from './edge-config-settings'
import { EDGE_REDIRECTS_KEY, type EdgeRedirect } from './redirects'

const edgeConfigId = edgeConfigIdFrom(process.env)
const vercelApiToken = process.env.VERCEL_API_TOKEN || undefined
const vercelTeamId = process.env.VERCEL_TEAM_ID || undefined

/** Whether a publish can rewrite the Edge Config redirects map (see README, "Edge Config redirects"). */
export const canSyncRedirects = canSyncRedirectsFrom(process.env)

/** Replaces the whole `redirects` item through the Vercel API. Throws if Vercel rejects it. */
export async function writeRedirectMap(map: Record<string, EdgeRedirect>) {
  if (!edgeConfigId || !vercelApiToken)
    throw new Error(
      'The Edge Config store id (EDGE_CONFIG or EDGE_CONFIG_ID) or VERCEL_API_TOKEN is not set',
    )

  const url = new URL(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`)
  if (vercelTeamId) url.searchParams.set('teamId', vercelTeamId)

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${vercelApiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ operation: 'upsert', key: EDGE_REDIRECTS_KEY, value: map }] }),
  })
  if (!response.ok) {
    throw new Error(
      `Vercel Edge Config update failed (${response.status}): ${await response.text()}`,
    )
  }
}
