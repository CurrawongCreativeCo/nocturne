/**
 * The audit's way into the content: a read-only client that can only send GET requests to the
 * Content Lake's query endpoint, with the read token (README, "Page audit"). It runs in a Node
 * script, never in the browser and never bundled into the site, and it has no method that writes:
 * there is no `fetch` of any other method or path in this file, and the tests fail if one appears.
 * Dependency-free, like the other launch tools.
 */

import { readCapped } from '../launch-check/net.mjs'

/** The most of a query result that is read; the audit's queries return a few documents. */
const MAX_RESULT = 1_000_000

/** Pinned like src/config/env.ts; the audit's queries are plain GROQ and need nothing newer. */
export const API_VERSION = 'v2026-10-01'

/**
 * `{ query(groq, params) }`. `apiHost` is only for the tests' fake Content Lake (SANITY_API_HOST).
 * Rejects with a message that never contains the token.
 */
export function createReadClient({ projectId, dataset, token, apiHost, fetchImpl = fetch }) {
  const base = apiHost ? apiHost.replace(/\/+$/, '') : `https://${projectId}.api.sanity.io`
  return {
    async query(groq, params = {}) {
      const search = new URLSearchParams({ query: groq, perspective: 'published' })
      for (const [name, value] of Object.entries(params))
        search.set(`$${name}`, JSON.stringify(value))
      const response = await fetchImpl(`${base}/${API_VERSION}/data/query/${dataset}?${search}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
        // Never follow a redirect with the token: an unexpected one is an error.
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? `Sanity refused the read token (HTTP ${response.status}).`
            : `Sanity answered HTTP ${response.status}.`,
        )
      }
      const body = JSON.parse((await readCapped(response, MAX_RESULT)).toString('utf8'))
      return body.result
    },
  }
}

/** A client from the environment, or null (with the reason) when the project or token is missing. */
export function clientFromEnv(env, { fetchImpl } = {}) {
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token = env.SANITY_API_READ_TOKEN
  if (!projectId || !token) {
    return {
      client: null,
      reason:
        'The content side was skipped: set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_READ_TOKEN (environment or .env.local) to attach documents and fields to the findings.',
    }
  }
  return {
    client: createReadClient({
      projectId,
      dataset: env.NEXT_PUBLIC_SANITY_DATASET || 'production',
      token,
      apiHost: env.SANITY_API_HOST || undefined,
      fetchImpl,
    }),
    reason: '',
  }
}
