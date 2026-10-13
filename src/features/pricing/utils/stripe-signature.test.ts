import { describe, expect, it } from 'vitest'

import { signStripePayload, verifyStripeSignature } from './stripe-signature'

const SECRET = 'whsec_test_secret'
const NOW = 1_800_000_000
const PAYLOAD = JSON.stringify({ id: 'evt_1', type: 'price.created' })

const verify = (overrides: Partial<Parameters<typeof verifyStripeSignature>[0]> = {}) =>
  verifyStripeSignature({
    payload: PAYLOAD,
    header: signStripePayload(PAYLOAD, SECRET, NOW),
    secret: SECRET,
    now: NOW,
    ...overrides,
  })

describe('verifyStripeSignature', () => {
  it('accepts a correctly signed, recent payload', () => {
    expect(verify()).toEqual({ ok: true })
  })

  it('rejects a body changed after signing', () => {
    expect(verify({ payload: `${PAYLOAD} ` }).ok).toBe(false)
  })

  it('rejects another secret', () => {
    expect(verify({ secret: 'whsec_other' }).ok).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(verify({ header: null })).toEqual({
      ok: false,
      reason: 'Missing Stripe-Signature header',
    })
  })

  it.each(['', 'garbage', 't=abc,v1=00', `t=${NOW}`, `v1=${'a'.repeat(64)}`, `t=${NOW},v1=`])(
    'rejects the malformed header %j',
    (header) => {
      expect(verify({ header }).ok).toBe(false)
    },
  )

  it('rejects a signature that is not 32 bytes of hex without throwing', () => {
    expect(verify({ header: `t=${NOW},v1=abcd` }).ok).toBe(false)
    expect(verify({ header: `t=${NOW},v1=${'z'.repeat(64)}` }).ok).toBe(false)
  })

  it('rejects a replayed (old) or future timestamp, and accepts the edge of the window', () => {
    const signedAt = (t: number) => signStripePayload(PAYLOAD, SECRET, t)
    expect(verify({ header: signedAt(NOW - 301) }).ok).toBe(false)
    expect(verify({ header: signedAt(NOW + 301) }).ok).toBe(false)
    expect(verify({ header: signedAt(NOW - 300) }).ok).toBe(true)
  })

  it('accepts any matching v1 while a secret is being rotated, ignoring v0', () => {
    const valid = signStripePayload(PAYLOAD, SECRET, NOW)
    const header = `t=${NOW},v1=${'0'.repeat(64)},v0=${'1'.repeat(64)},${valid.split(',')[1]}`
    expect(verify({ header }).ok).toBe(true)
  })

  it('does not accept a v0-only signature', () => {
    const real = signStripePayload(PAYLOAD, SECRET, NOW).split('v1=')[1]
    expect(verify({ header: `t=${NOW},v0=${real}` }).ok).toBe(false)
  })
})
