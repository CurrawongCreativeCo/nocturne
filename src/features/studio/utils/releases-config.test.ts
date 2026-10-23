import { describe, expect, it } from 'vitest'

import { DEFAULT_FEATURES, resolveSiteProfile } from '@/config/profile'

import { releasesSettings } from './releases-config'

const client = { name: 'Acme Plumbing', slug: 'acme-plumbing' }

describe('releases flag', () => {
  it('starts off for a new site, and every other feature stays on', () => {
    const { features } = resolveSiteProfile({ client })
    expect(features.releases).toBe(false)
    expect(Object.entries(features).filter(([, on]) => !on)).toEqual([['releases', false]])
    expect(DEFAULT_FEATURES.releases).toBe(false)
  })

  it('is switched on by the profile', () => {
    expect(resolveSiteProfile({ client, features: { releases: true } }).features.releases).toBe(
      true,
    )
  })

  it('rejects a non-boolean value', () => {
    expect(() =>
      resolveSiteProfile({ client, features: { releases: 'yes' as unknown as boolean } }),
    ).toThrow('features.releases must be true or false')
  })
})

describe('releasesSettings', () => {
  it('turns Releases and scheduled drafts off together, so no upgrade screen remains', () => {
    expect(releasesSettings({ releases: false })).toEqual({
      releases: { enabled: false },
      scheduledDrafts: { enabled: false },
    })
  })

  it('turns both on when the plan includes them', () => {
    expect(releasesSettings({ releases: true })).toEqual({
      releases: { enabled: true },
      scheduledDrafts: { enabled: true },
    })
  })
})
