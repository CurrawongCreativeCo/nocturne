import { describe, expect, it } from 'vitest'

import { getNewsletterConfig } from './config'

const turnstile = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET_KEY: 'secret' }

describe('getNewsletterConfig', () => {
  it('reads Resend', () => {
    const env = { ...turnstile, NEWSLETTER_PROVIDER: 'resend', RESEND_API_KEY: 'r' }
    expect(getNewsletterConfig(env)).toEqual({
      ready: true,
      testMode: false,
      turnstileSiteKey: 'site',
      turnstileSecretKey: 'secret',
      provider: { provider: 'resend', apiKey: 'r', segmentId: undefined },
    })
  })

  it('reads Loops, with its optional list', () => {
    const env = {
      ...turnstile,
      NEWSLETTER_PROVIDER: 'loops',
      LOOPS_API_KEY: 'l',
      LOOPS_MAILING_LIST_ID: 'list',
    }
    expect(getNewsletterConfig(env)).toMatchObject({
      provider: { provider: 'loops', apiKey: 'l', mailingListId: 'list' },
    })
  })

  it('reads Mailchimp, ignoring the name’s case and spaces', () => {
    const env = {
      ...turnstile,
      NEWSLETTER_PROVIDER: ' Mailchimp ',
      MAILCHIMP_API_KEY: 'k-us1',
      MAILCHIMP_LIST_ID: 'l',
    }
    expect(getNewsletterConfig(env)).toMatchObject({
      provider: { provider: 'mailchimp', apiKey: 'k-us1', listId: 'l' },
    })
  })

  it('lists what is missing for the chosen provider only', () => {
    expect(getNewsletterConfig({ NEWSLETTER_PROVIDER: 'mailchimp' })).toEqual({
      ready: false,
      missing: [
        'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
        'TURNSTILE_SECRET_KEY',
        'MAILCHIMP_API_KEY',
        'MAILCHIMP_LIST_ID',
      ],
    })
    expect(getNewsletterConfig({ ...turnstile, NEWSLETTER_PROVIDER: 'loops' })).toEqual({
      ready: false,
      missing: ['LOOPS_API_KEY'],
    })
  })

  it('is not ready without a known provider', () => {
    for (const NEWSLETTER_PROVIDER of [undefined, '', 'sendgrid']) {
      expect(getNewsletterConfig({ ...turnstile, NEWSLETTER_PROVIDER })).toEqual({
        ready: false,
        missing: ['NEWSLETTER_PROVIDER (resend, loops or mailchimp)'],
      })
    }
  })

  it('needs nothing in test mode, but not on a production Vercel deployment', () => {
    expect(getNewsletterConfig({ FORMS_TEST_MODE: '1' })).toEqual({ ready: true, testMode: true })
    expect(getNewsletterConfig({ FORMS_TEST_MODE: '1', VERCEL_ENV: 'production' }).ready).toBe(
      false,
    )
  })
})
