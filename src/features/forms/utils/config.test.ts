import { describe, expect, it } from 'vitest'

import { getFormsConfig, isTestMode } from './config'

const complete = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site',
  TURNSTILE_SECRET_KEY: 'secret',
  RESEND_API_KEY: 'resend',
  FORMS_FROM_EMAIL: 'Site <forms@example.com>',
}

describe('getFormsConfig', () => {
  it('is ready when every variable is set', () => {
    expect(getFormsConfig(complete)).toEqual({
      ready: true,
      testMode: false,
      turnstileSiteKey: 'site',
      turnstileSecretKey: 'secret',
      resendApiKey: 'resend',
      fromEmail: 'Site <forms@example.com>',
    })
  })

  it('lists exactly what is missing, treating an empty value as missing', () => {
    expect(getFormsConfig({})).toEqual({
      ready: false,
      missing: [
        'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
        'TURNSTILE_SECRET_KEY',
        'RESEND_API_KEY',
        'FORMS_FROM_EMAIL',
      ],
    })
    expect(
      getFormsConfig({ ...complete, RESEND_API_KEY: '', FORMS_FROM_EMAIL: undefined }),
    ).toEqual({
      ready: false,
      missing: ['RESEND_API_KEY', 'FORMS_FROM_EMAIL'],
    })
  })

  it('needs no keys in test mode', () => {
    expect(getFormsConfig({ FORMS_TEST_MODE: '1' })).toEqual({ ready: true, testMode: true })
  })

  it('ignores the test-mode flag on a production Vercel deployment', () => {
    const env = { FORMS_TEST_MODE: '1', VERCEL_ENV: 'production' }
    expect(isTestMode(env)).toBe(false)
    expect(getFormsConfig(env).ready).toBe(false)
    expect(isTestMode({ FORMS_TEST_MODE: '1', VERCEL_ENV: 'preview' })).toBe(true)
  })
})
