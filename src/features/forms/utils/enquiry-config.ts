/**
 * Whether submissions are stored as `enquiry` documents (README, "Enquiries"). Server-side only:
 * the write token is a secret, so neither variable has a NEXT_PUBLIC_ prefix.
 */

type Env = Record<string, string | undefined>

export type EnquiryConfig = { enabled: false } | { enabled: true; writeToken: string }

/** True when `ENQUIRIES_STORE=1`. The page only needs this much, to decide whether to collect attribution. */
export function isEnquiryStoreRequested(env: Env = process.env) {
  return env.ENQUIRIES_STORE === '1'
}

/**
 * `missing` is set when the flag is on but the token is not, so the caller can say so in the log
 * instead of silently storing nothing.
 */
export function getEnquiryConfig(env: Env = process.env): EnquiryConfig & { missing?: string } {
  if (!isEnquiryStoreRequested(env)) return { enabled: false }
  const writeToken = env.SANITY_WRITE_TOKEN
  if (!writeToken) return { enabled: false, missing: 'SANITY_WRITE_TOKEN' }
  return { enabled: true, writeToken }
}
