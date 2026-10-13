import { describe, expect, it } from 'vitest'

import {
  getApiHost,
  getCheckoutConfig,
  getWebhookConfig,
  resolveReturnUrl,
  sameSiteUrl,
} from './config'

const SITE = 'https://example.com'

describe('resolveReturnUrl', () => {
  it('resolves a path against the site and leaves Stripe’s placeholder alone', () => {
    expect(resolveReturnUrl('/thanks', SITE)).toBe('https://example.com/thanks')
    expect(resolveReturnUrl('/thanks?session_id={CHECKOUT_SESSION_ID}', SITE)).toBe(
      'https://example.com/thanks?session_id={CHECKOUT_SESSION_ID}',
    )
  })

  it('accepts a full http(s) URL as is', () => {
    expect(resolveReturnUrl('https://shop.example.org/done', SITE)).toBe(
      'https://shop.example.org/done',
    )
  })

  it.each([
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'thanks',
    'ftp://x.test',
    '',
  ])('refuses %j', (value) => {
    expect(resolveReturnUrl(value, SITE)).toBeNull()
  })
})

describe('sameSiteUrl', () => {
  it('keeps a URL on the site’s origin', () => {
    expect(sameSiteUrl('https://example.com/pricing?x=1', SITE)).toBe(
      'https://example.com/pricing?x=1',
    )
  })

  it.each([null, '', 'not a url', 'https://evil.example/pricing', 'http://example.com/pricing'])(
    'drops %j',
    (value) => {
      expect(sameSiteUrl(value, SITE)).toBeNull()
    },
  )
})

describe('getCheckoutConfig', () => {
  it('needs the secret key', () => {
    expect(getCheckoutConfig(SITE, {})).toEqual({ ready: false, missing: ['STRIPE_SECRET_KEY'] })
  })

  it('defaults the success URL to the site and leaves cancel to the page the buyer came from', () => {
    expect(getCheckoutConfig(SITE, { STRIPE_SECRET_KEY: 'sk_test_1' })).toEqual({
      ready: true,
      secretKey: 'sk_test_1',
      apiHost: 'https://api.stripe.com',
      successUrl: 'https://example.com/?checkout=success',
      cancelUrl: null,
    })
  })

  it('uses configured URLs', () => {
    expect(
      getCheckoutConfig(SITE, {
        STRIPE_SECRET_KEY: 'sk_test_1',
        STRIPE_SUCCESS_URL: '/thanks',
        STRIPE_CANCEL_URL: 'https://example.com/pricing',
      }),
    ).toMatchObject({
      successUrl: 'https://example.com/thanks',
      cancelUrl: 'https://example.com/pricing',
    })
  })

  it('names a configured URL that can’t be used', () => {
    const result = getCheckoutConfig(SITE, {
      STRIPE_SECRET_KEY: 'sk_test_1',
      STRIPE_CANCEL_URL: '//evil.example',
    })
    expect(result.ready).toBe(false)
    expect(result.ready ? [] : result.missing[0]).toMatch(/^STRIPE_CANCEL_URL/)
  })
})

describe('getWebhookConfig', () => {
  const full = {
    STRIPE_WEBHOOK_SECRET: 'whsec_1',
    STRIPE_SECRET_KEY: 'sk_test_1',
    SANITY_WRITE_TOKEN: 'sk-write',
  }

  it('is ready with all three', () => {
    expect(getWebhookConfig(full)).toEqual({
      ready: true,
      webhookSecret: 'whsec_1',
      secretKey: 'sk_test_1',
      writeToken: 'sk-write',
      apiHost: 'https://api.stripe.com',
    })
  })

  it('lists what is missing', () => {
    expect(getWebhookConfig({ STRIPE_SECRET_KEY: 'sk_test_1' })).toEqual({
      ready: false,
      missing: ['STRIPE_WEBHOOK_SECRET', 'SANITY_WRITE_TOKEN'],
    })
  })
})

describe('getApiHost', () => {
  it('can be redirected for tests, but not on Vercel production', () => {
    expect(getApiHost({ STRIPE_API_HOST: 'http://localhost:9999/stripe/' })).toBe(
      'http://localhost:9999/stripe',
    )
    expect(getApiHost({ STRIPE_API_HOST: 'http://localhost:9999', VERCEL_ENV: 'production' })).toBe(
      'https://api.stripe.com',
    )
  })
})
