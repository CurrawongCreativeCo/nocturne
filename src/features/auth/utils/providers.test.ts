import { describe, expect, it } from 'vitest'

import { enabledProviders } from './providers'

describe('enabledProviders', () => {
  it('is empty without configuration', () => {
    expect(enabledProviders({})).toEqual([])
  })

  it('needs both the id and the secret', () => {
    expect(enabledProviders({ AUTH_GITHUB_ID: 'id' })).toEqual([])
    expect(enabledProviders({ AUTH_GITHUB_ID: 'id', AUTH_GITHUB_SECRET: 's' })).toEqual(['github'])
    expect(
      enabledProviders({
        AUTH_GITHUB_ID: 'id',
        AUTH_GITHUB_SECRET: 's',
        AUTH_GOOGLE_ID: 'id',
        AUTH_GOOGLE_SECRET: 's',
      }),
    ).toEqual(['github', 'google'])
  })

  it('turns the test account on only in test mode, with a password, outside Vercel production', () => {
    const env = { AUTH_TEST_MODE: '1', AUTH_TEST_PASSWORD: 'pw' }
    expect(enabledProviders(env)).toEqual(['test'])
    expect(enabledProviders({ AUTH_TEST_MODE: '1' })).toEqual([])
    expect(enabledProviders({ AUTH_TEST_PASSWORD: 'pw' })).toEqual([])
    expect(enabledProviders({ ...env, VERCEL_ENV: 'preview' })).toEqual(['test'])
    expect(enabledProviders({ ...env, VERCEL_ENV: 'production' })).toEqual([])
  })
})
