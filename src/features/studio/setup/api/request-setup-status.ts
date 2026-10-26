import type { FeatureReport } from '@/lib/config/evaluate'

import type { ExplanationsReason, SetupStatusResponse } from '../utils/setup-view'

/** The site's route, on the Studio's own origin: the token goes nowhere else. */
export const SETUP_STATUS_PATH = '/api/setup-status'

export type SetupStatusAnswer =
  | { kind: 'status'; status: SetupStatusResponse }
  /** The site can't or won't say: explanations only, no status from anywhere else. */
  | { kind: 'explanations'; reason: ExplanationsReason }
  /** The route failed (busy, down, malformed): try again. Not a verdict on the deployment. */
  | { kind: 'error' }

/**
 * True when Studio is served under the site's own Studio path (`/studio`), the supported setup:
 * the same deployment, so `/api/setup-status` is the site's own route. A Studio hosted anywhere
 * else (sanity.studio, another domain, the root of another site) is not, and sends nothing.
 */
export function isEmbedded(pathname: string, studioPath: string): boolean {
  return pathname === studioPath || pathname.startsWith(`${studioPath}/`)
}

function isStatus(body: unknown): body is SetupStatusResponse {
  if (typeof body !== 'object' || body === null) return false
  const status = body as Partial<SetupStatusResponse>
  return (
    status.schema === 1 &&
    typeof status.templateVersion === 'string' &&
    Array.isArray(status.features) &&
    (status.features as (Partial<FeatureReport> | null)[]).every(
      (feature) =>
        typeof feature === 'object' &&
        feature !== null &&
        typeof feature.id === 'string' &&
        typeof feature.status === 'string' &&
        Array.isArray(feature.missing) &&
        Array.isArray(feature.invalid),
    )
  )
}

/**
 * Asks `GET /api/setup-status` for the setup details with the signed-in person's own Sanity token
 * (`client.config().token`, set when Studio signs in with a token; null when it uses a cookie, in
 * which case there is nothing to send and no request is made). The server checks that token with
 * Sanity on every request; this only turns its answer into what the pane shows. 401 and 403 mean
 * explanations only, as does a missing route. Anything else is an error to retry. Never throws,
 * except to propagate an abort.
 */
export async function requestSetupStatus({
  token,
  fetch,
  signal,
  embedded = true,
}: {
  token: string | undefined | null
  fetch: typeof globalThis.fetch
  signal?: AbortSignal
  /**
   * Whether Studio is served by the site it would ask (`isEmbedded`). When it isn't, the token is
   * not sent anywhere: a relative URL would land on whichever host serves this Studio.
   */
  embedded?: boolean
}): Promise<SetupStatusAnswer> {
  if (!embedded) return { kind: 'explanations', reason: 'separate-host' }
  if (!token) return { kind: 'explanations', reason: 'no-token' }
  try {
    const response = await fetch(SETUP_STATUS_PATH, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal,
    })
    if (response.status === 401 || response.status === 403) {
      return { kind: 'explanations', reason: 'refused' }
    }
    if (response.status === 404) return { kind: 'explanations', reason: 'missing' }
    if (response.status !== 200) return { kind: 'error' }
    const body: unknown = await response.json().catch(() => null)
    return isStatus(body) ? { kind: 'status', status: body } : { kind: 'error' }
  } catch (error) {
    if (signal?.aborted) throw error
    return { kind: 'error' }
  }
}
