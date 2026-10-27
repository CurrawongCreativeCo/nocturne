import { describe, expect, it } from 'vitest'

import {
  canSyncRedirectsFrom,
  edgeConfigIdFrom,
  getRedirectsReadiness,
} from './edge-config-settings'

const CONNECTION = 'https://edge-config.vercel.com/ecfg_abc123XYZ?token=SECRET_TOKEN_VALUE'

describe('edgeConfigIdFrom', () => {
  it('reads the store id from the connection string', () => {
    expect(edgeConfigIdFrom({ EDGE_CONFIG: CONNECTION })).toBe('ecfg_abc123XYZ')
    expect(
      edgeConfigIdFrom({ EDGE_CONFIG: 'https://global-config.vercel.com/ecfg_abc123?token=t' }),
    ).toBe('ecfg_abc123')
  })

  it('uses EDGE_CONFIG_ID when the connection string does not show an id', () => {
    expect(
      edgeConfigIdFrom({ EDGE_CONFIG: 'https://x.example/odd', EDGE_CONFIG_ID: 'ecfg_x' }),
    ).toBe('ecfg_x')
    expect(edgeConfigIdFrom({ EDGE_CONFIG_ID: 'ecfg_x' })).toBe('ecfg_x')
  })

  it("gives up on a string it doesn't recognise, and never returns the token", () => {
    for (const value of [
      'not a url',
      'https://edge-config.vercel.com/?token=SECRET',
      'http://edge-config.vercel.com/ecfg_abc?token=SECRET',
      'https://evil.example/ecfg_abc?token=SECRET',
      '',
    ]) {
      expect(edgeConfigIdFrom({ EDGE_CONFIG: value })).toBeUndefined()
    }
    expect(JSON.stringify(edgeConfigIdFrom({ EDGE_CONFIG: CONNECTION }))).not.toContain('SECRET')
  })
})

describe('a conflicting or invalid EDGE_CONFIG_ID', () => {
  const conflict = { EDGE_CONFIG: CONNECTION, EDGE_CONFIG_ID: 'ecfg_other', VERCEL_API_TOKEN: 't' }

  it('is not written to: nothing is synced when the two name different stores', () => {
    expect(edgeConfigIdFrom(conflict)).toBeUndefined()
    expect(canSyncRedirectsFrom(conflict)).toBe(false)
    expect(getRedirectsReadiness(conflict)).toMatchObject({
      ready: false,
      missing: [expect.stringContaining('different store')],
    })
  })

  it('accepts the same id in both places', () => {
    expect(edgeConfigIdFrom({ ...conflict, EDGE_CONFIG_ID: 'ecfg_abc123XYZ' })).toBe(
      'ecfg_abc123XYZ',
    )
  })

  it('refuses an id that is not a store id', () => {
    const env = { EDGE_CONFIG_ID: 'not-a-store', VERCEL_API_TOKEN: 't' }
    expect(edgeConfigIdFrom(env)).toBeUndefined()
    expect(canSyncRedirectsFrom(env)).toBe(false)
  })

  it('never puts the token or the connection string in what it says', () => {
    const text = JSON.stringify(getRedirectsReadiness(conflict))
    expect(text).not.toContain('SECRET_TOKEN_VALUE')
    expect(text).not.toContain('edge-config.vercel.com')
  })
})

describe('canSyncRedirectsFrom', () => {
  it('needs an id (given or derived) and a token', () => {
    expect(canSyncRedirectsFrom({})).toBe(false)
    expect(canSyncRedirectsFrom({ EDGE_CONFIG: CONNECTION })).toBe(false)
    expect(canSyncRedirectsFrom({ EDGE_CONFIG: CONNECTION, VERCEL_API_TOKEN: 't' })).toBe(true)
    expect(canSyncRedirectsFrom({ EDGE_CONFIG_ID: 'ecfg_x', VERCEL_API_TOKEN: 't' })).toBe(true)
  })
})

describe('getRedirectsReadiness', () => {
  it('names what is missing', () => {
    expect(getRedirectsReadiness({})).toEqual({
      ready: false,
      missing: ['EDGE_CONFIG', 'VERCEL_API_TOKEN'],
    })
    expect(
      getRedirectsReadiness({ EDGE_CONFIG: 'https://x.example/odd', VERCEL_API_TOKEN: 't' }),
    ).toMatchObject({ ready: false, missing: [expect.stringContaining('EDGE_CONFIG_ID')] })
  })

  it('is ready with the connection string and a token', () => {
    expect(getRedirectsReadiness({ EDGE_CONFIG: CONNECTION, VERCEL_API_TOKEN: 't' })).toEqual({
      ready: true,
    })
  })
})
