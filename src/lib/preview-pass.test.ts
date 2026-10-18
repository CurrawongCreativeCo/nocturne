import { describe, expect, it, vi } from 'vitest'

// 'server-only' throws outside a server bundle; the module is tested directly here.
vi.mock('server-only', () => ({}))

import {
  PREVIEW_CLOCK_SKEW_MS,
  PREVIEW_COOKIE,
  PREVIEW_TTL_MS,
  createPreviewPass,
  previewCookieHeader,
  previewSecret,
  verifyPreviewPass,
} from './preview-pass'

const SECRET = 'a-test-secret-of-sufficient-length'
const NOW = Date.UTC(2026, 9, 18, 9, 0, 0)

describe('createPreviewPass and verifyPreviewPass', () => {
  it('round-trips', () => {
    const pass = createPreviewPass(NOW, PREVIEW_TTL_MS, SECRET)
    expect(pass).toMatch(/^v1\.\d+\.[0-9a-f]{64}$/)
    expect(verifyPreviewPass(pass, NOW, SECRET)).toBe(true)
    expect(verifyPreviewPass(pass, NOW + PREVIEW_TTL_MS - 1, SECRET)).toBe(true)
  })

  it('expires, with 60 seconds of clock skew', () => {
    const pass = createPreviewPass(NOW, PREVIEW_TTL_MS, SECRET)
    const expiry = NOW + PREVIEW_TTL_MS
    expect(verifyPreviewPass(pass, expiry + PREVIEW_CLOCK_SKEW_MS, SECRET)).toBe(true)
    expect(verifyPreviewPass(pass, expiry + PREVIEW_CLOCK_SKEW_MS + 1, SECRET)).toBe(false)
  })

  it('rejects a changed expiry (the signature no longer fits)', () => {
    const pass = createPreviewPass(NOW, 1000, SECRET) ?? ''
    const [version, , signature] = pass.split('.')
    expect(
      verifyPreviewPass(
        `${version}.${String(NOW + 10 * PREVIEW_TTL_MS)}.${signature}`,
        NOW,
        SECRET,
      ),
    ).toBe(false)
  })

  it('rejects a changed signature, a changed version and a pass signed with another secret', () => {
    const pass = createPreviewPass(NOW, PREVIEW_TTL_MS, SECRET) ?? ''
    const flipped = pass.slice(0, -1) + (pass.endsWith('0') ? '1' : '0')
    expect(verifyPreviewPass(flipped, NOW, SECRET)).toBe(false)
    expect(verifyPreviewPass(pass.replace('v1', 'v2'), NOW, SECRET)).toBe(false)
    expect(verifyPreviewPass(pass, NOW, 'a-different-secret-after-rotation')).toBe(false)
  })

  it.each([
    undefined,
    null,
    '',
    'v1',
    'v1.123',
    'v1.123.abc',
    `v1..${'a'.repeat(64)}`,
    `v1.-5.${'a'.repeat(64)}`,
    `v1.1e9.${'a'.repeat(64)}`,
    `v1.123.${'g'.repeat(64)}`,
    `v1.123.${'a'.repeat(64)}.extra`,
    'true',
    'anything',
  ])('rejects %j', (value) => {
    expect(verifyPreviewPass(value, NOW, SECRET)).toBe(false)
  })

  it('never accepts the same pass signed with an empty secret', () => {
    expect(verifyPreviewPass(createPreviewPass(NOW, PREVIEW_TTL_MS, ''), NOW, '')).toBe(false)
  })
})

describe('without a secret', () => {
  it('makes no pass and accepts none', () => {
    expect(previewSecret({})).toBeUndefined()
    expect(createPreviewPass(NOW, PREVIEW_TTL_MS, undefined)).toBeNull()
    const pass = createPreviewPass(NOW, PREVIEW_TTL_MS, SECRET)
    expect(verifyPreviewPass(pass, NOW, undefined)).toBe(false)
  })

  it('treats a short secret as missing', () => {
    expect(previewSecret({ PREVIEW_ACCESS_SECRET: 'short' })).toBeUndefined()
    expect(previewSecret({ PREVIEW_ACCESS_SECRET: SECRET })).toBe(SECRET)
  })
})

describe('previewCookieHeader', () => {
  it('is HttpOnly, SameSite=Lax, for the whole site, for 8 hours', () => {
    const header = previewCookieHeader('v1.1.abc', { secure: false })
    expect(header).toBe(`${PREVIEW_COOKIE}=v1.1.abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`)
  })

  it('adds Secure on https, and clears with Max-Age=0', () => {
    expect(previewCookieHeader('x', { secure: true })).toContain('; Secure')
    expect(previewCookieHeader(null, { secure: true })).toBe(
      `${PREVIEW_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
    )
  })
})
