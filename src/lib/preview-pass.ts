import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { MIN_PREVIEW_SECRET_LENGTH, previewSecret } from './preview-secret'

/**
 * The pre-launch preview pass (README, "Pre-launch and launch"): a signed, expiring cookie that lets
 * the gate in `proxy.ts` show the whole site to the team and the client. It is issued by draft mode
 * (Presentation) and by the optional client preview link, and carries no user data.
 *
 * `v1.<expiry in ms>.<HMAC-SHA256 hex of "v1.<expiry>" with PREVIEW_ACCESS_SECRET>`. Anyone can set a
 * cookie with any name or value, so the gate trusts only a value that verifies here. Without the
 * secret no pass can be made or accepted, and the gate stays closed. Rotating the secret
 * invalidates every pass issued before.
 *
 * Node's crypto, which the proxy runs on (Next.js 16). The secret never reaches the client: this
 * module is server-only and nothing here logs a value.
 */

export const PREVIEW_COOKIE = 'site_preview'
/** How long a pass lasts: a working day. */
export const PREVIEW_TTL_MS = 8 * 60 * 60 * 1000
/** A server whose clock is a little ahead still accepts a pass that has just expired. */
export const PREVIEW_CLOCK_SKEW_MS = 60_000
const VERSION = 'v1'
const SIGNATURE = /^[0-9a-f]{64}$/

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('hex')

/**
 * A new pass valid for `ttlMs` from `now` (milliseconds), or null when there is no secret to sign
 * it with. `secret` is for tests; routes use the environment.
 */
export function createPreviewPass(
  now: number,
  ttlMs = PREVIEW_TTL_MS,
  secret = previewSecret(process.env),
): string | null {
  if (!secret) return null
  const payload = `${VERSION}.${String(Math.floor(now + ttlMs))}`
  return `${payload}.${sign(payload, secret)}`
}

/** Whether `value` is an unexpired pass signed with the current secret. Never throws. */
export function verifyPreviewPass(
  value: string | null | undefined,
  now: number,
  secret = previewSecret(process.env),
): boolean {
  if (!secret || typeof value !== 'string') return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [version, expiry, signature] = parts
  if (version !== VERSION || !/^\d{1,15}$/.test(expiry ?? '') || !SIGNATURE.test(signature ?? '')) {
    return false
  }

  const expected = Buffer.from(sign(`${VERSION}.${expiry ?? ''}`, secret), 'hex')
  const given = Buffer.from(signature ?? '', 'hex')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false

  return Number(expiry) + PREVIEW_CLOCK_SKEW_MS >= now
}

/** The pass cookie's attributes, for `cookies().set()`; `previewCookieHeader` writes the same ones. */
export const previewCookieOptions = ({ secure }: { secure: boolean }) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: PREVIEW_TTL_MS / 1000,
  secure,
})

/**
 * A `Set-Cookie` header value for the pass: HttpOnly, SameSite=Lax (Presentation in Studio is
 * same-origin, so it still sends it), Secure on https, for the whole site, for 8 hours. `null`
 * clears it.
 */
export function previewCookieHeader(value: string | null, { secure }: { secure: boolean }): string {
  const attributes = [
    `${PREVIEW_COOKIE}=${value ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${value === null ? 0 : String(PREVIEW_TTL_MS / 1000)}`,
  ]
  if (secure) attributes.push('Secure')
  return attributes.join('; ')
}

let warned = false

/** Says once, without any value, that passes can't be issued because the secret is missing. */
export function warnNoPreviewSecret() {
  if (warned) return
  warned = true
  console.warn(
    `PREVIEW_ACCESS_SECRET is not set (or is under ${String(MIN_PREVIEW_SECRET_LENGTH)} characters): no pre-launch preview pass can be issued. Presentation still works through draft mode, but pages that are private before launch stay private in it.`,
  )
}
