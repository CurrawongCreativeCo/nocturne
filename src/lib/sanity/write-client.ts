import 'server-only'

import { client } from './client'

/**
 * A client that can write, for server code that mirrors outside data into the dataset (the Stripe
 * webhook). The token needs the Editor role and lives in `SANITY_WRITE_TOKEN`, server-side only:
 * never give it a `NEXT_PUBLIC_` prefix, and never import this from a client component (the
 * `server-only` import above makes that a build error). Reads still go through `cachedSanityFetch`.
 */
export function getWriteClient(token = process.env.SANITY_WRITE_TOKEN) {
  if (!token) throw new Error('Missing environment variable: SANITY_WRITE_TOKEN')
  return client.withConfig({ token, useCdn: false, stega: false, perspective: 'raw' })
}
