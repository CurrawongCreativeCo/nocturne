import 'server-only'

import { client } from '@/lib/sanity/client'

/** How long a verdict is trusted; a dataset is not made public by accident every few minutes. */
const TRUST_MS = 60 * 60 * 1000

let verified: { private: boolean; until: number } | undefined

/**
 * Whether the dataset refuses anonymous reads, which is what "private" means. It asks the way a
 * stranger would: one query with no token. A private dataset answers 401 or 403; a public one answers
 * with data. Anything else (network error, 5xx) is "unknown", which callers treat as "not private":
 * personal details are never written on a guess. A verdict is remembered for an hour per server
 * instance, so this costs one request, not one per submission.
 */
export async function isDatasetPrivate(now = Date.now()): Promise<boolean> {
  if (verified && verified.until > now) return verified.private
  try {
    await client
      .withConfig({ token: undefined, useCdn: false, stega: false, perspective: 'raw' })
      .fetch('count(*[_type == "enquiry"])')
    verified = { private: false, until: now + TRUST_MS }
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status !== 401 && status !== 403) return false
    verified = { private: true, until: now + TRUST_MS }
  }
  return verified.private
}
