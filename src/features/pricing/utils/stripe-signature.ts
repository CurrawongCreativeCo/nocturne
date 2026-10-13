import { createHmac, timingSafeEqual } from 'node:crypto'

/** Stripe rejects events older than this by default; so do we. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

export type SignatureResult = { ok: true } | { ok: false; reason: string }

interface Input {
  /** The request body exactly as received. Re-serialized JSON no longer matches the signature. */
  payload: string
  /** The `Stripe-Signature` header: `t=<unix seconds>,v1=<hex hmac>[,v1=…][,v0=…]`. */
  header: string | null
  /** The endpoint's signing secret (`whsec_…`), used as is. */
  secret: string
  /** Unix seconds; a parameter so tests control the clock. */
  now: number
  toleranceSeconds?: number
}

/**
 * Checks a webhook's `Stripe-Signature` (https://docs.stripe.com/webhooks#verify-manually): an
 * HMAC-SHA256 of `<timestamp>.<body>` keyed with the signing secret, compared in constant time.
 * The timestamp must be recent, so a captured request can't be replayed later. During secret
 * rotation Stripe sends one `v1` per active secret; any match is enough.
 */
export function verifyStripeSignature({
  payload,
  header,
  secret,
  now,
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
}: Input): SignatureResult {
  if (!header) return { ok: false, reason: 'Missing Stripe-Signature header' }

  let timestamp: string | undefined
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [name, value] = part.trim().split('=')
    if (name === 't') timestamp = value
    else if (name === 'v1' && value) signatures.push(value)
  }

  const seconds = Number(timestamp)
  if (!timestamp || !Number.isInteger(seconds) || signatures.length === 0) {
    return { ok: false, reason: 'Malformed Stripe-Signature header' }
  }
  if (Math.abs(now - seconds) > toleranceSeconds) {
    return { ok: false, reason: 'Timestamp outside the tolerance window' }
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest()
  const matches = signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
  })
  return matches ? { ok: true } : { ok: false, reason: 'No signature matches' }
}

/** Builds a valid header for a payload. Used by tests (and handy for trying the route with curl). */
export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}
