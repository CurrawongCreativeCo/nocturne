import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FEATURES,
  FEATURE_NAMES,
  hasEvents,
  hasTeamProfiles,
  isFeatureEnabled,
  resolveSiteProfile,
  siteProfile,
  validateSiteProfile,
  type SiteProfileInput,
} from './profile'
import { templateVersion } from './template-version'

const valid: SiteProfileInput = { client: { name: 'Acme Plumbing', slug: 'acme-plumbing' } }

describe('validateSiteProfile', () => {
  it('accepts the minimum: a client name and slug', () => {
    expect(validateSiteProfile(valid)).toEqual([])
  })

  it('accepts a full profile', () => {
    expect(
      validateSiteProfile(
        {
          ...valid,
          tier: 'commerce',
          features: { blog: false, pricing: true },
          clientSections: ['richText', 'faq'],
          help: {
            guideUrl: 'https://example.com/guide',
            videos: { 'edit-a-page': 'https://x.test/v' },
            supportEmail: 'help@example.com',
          },
        },
        { sectionNames: ['richText', 'faq', 'hero'] },
      ),
    ).toEqual([])
  })

  it('reports missing fields', () => {
    expect(validateSiteProfile({})).toEqual(['client is missing: add { name, slug }.'])
    expect(validateSiteProfile({ client: {} })).toEqual([
      expect.stringContaining('client.name is missing'),
      expect.stringContaining('client.slug is missing'),
    ])
    expect(validateSiteProfile({ client: { name: '  ', slug: 'a' } })).toEqual([
      expect.stringContaining('client.name is missing'),
    ])
    expect(validateSiteProfile(null)).toEqual(['The profile must be an object.'])
  })

  it('rejects a slug that is not lowercase hyphenated', () => {
    expect(validateSiteProfile({ client: { name: 'A', slug: 'Acme Plumbing' } })).toEqual([
      expect.stringContaining('client.slug "Acme Plumbing" must be lowercase'),
    ])
  })

  it('rejects an unknown tier', () => {
    expect(validateSiteProfile({ ...valid, tier: 'enterprise' })).toEqual([
      expect.stringContaining('tier "enterprise"'),
    ])
  })

  it('rejects unknown and non-boolean features', () => {
    const errors = validateSiteProfile({ ...valid, features: { blogg: true, search: 'yes' } })
    expect(errors).toEqual([
      expect.stringContaining('features.blogg is not a known feature'),
      expect.stringContaining('features.search must be true or false'),
    ])
  })

  it('rejects unknown section names, but only when the real names are given', () => {
    const input = { ...valid, clientSections: ['richText', 'heroo'] }
    expect(validateSiteProfile(input)).toEqual([])
    expect(validateSiteProfile(input, { sectionNames: ['richText', 'hero'] })).toEqual([
      'clientSections lists "heroo", which is not a section type.',
    ])
  })

  it('rejects a duplicated or non-string section', () => {
    expect(validateSiteProfile({ ...valid, clientSections: ['faq', 'faq'] })).toEqual([
      'clientSections lists a section twice.',
    ])
    expect(validateSiteProfile({ ...valid, clientSections: [1] })).toEqual([
      'clientSections must be a list of section type names.',
    ])
  })

  it('requires https help links', () => {
    const errors = validateSiteProfile({
      ...valid,
      help: { guideUrl: 'http://example.com', videos: { 'edit-a-page': 'nope' } },
    })
    expect(errors).toEqual([
      'help.guideUrl must be an https URL.',
      'help.videos.edit-a-page must be an https URL.',
    ])
  })
})

describe('help.supportEmail', () => {
  it('must be an email address', () => {
    expect(validateSiteProfile({ ...valid, help: { supportEmail: 'not an email' } })).toEqual([
      'help.supportEmail must be an email address.',
    ])
  })

  it('is kept by resolveSiteProfile', () => {
    const { help } = resolveSiteProfile({ ...valid, help: { supportEmail: 'help@example.com' } })
    expect(help.supportEmail).toBe('help@example.com')
  })
})

describe('resolveSiteProfile', () => {
  it('fills in the defaults and the template version', () => {
    expect(resolveSiteProfile(valid)).toEqual({
      client: { name: 'Acme Plumbing', slug: 'acme-plumbing' },
      tier: 'custom',
      features: DEFAULT_FEATURES,
      clientSections: [],
      help: {},
      templateVersion,
    })
  })

  it('lets a profile switch features off and leaves the rest on', () => {
    const { features } = resolveSiteProfile({ ...valid, features: { blog: false, team: false } })
    expect(features.blog).toBe(false)
    expect(features.team).toBe(false)
    expect(features.search).toBe(true)
  })

  it('throws one error listing every problem', () => {
    expect(() =>
      resolveSiteProfile({ client: { name: '', slug: '' }, tier: 'x' } as never),
    ).toThrow(/client\.name[\s\S]*client\.slug[\s\S]*tier "x"/)
  })
})

describe('isFeatureEnabled', () => {
  it('reads the profile it is given', () => {
    const off = resolveSiteProfile({ ...valid, features: { search: false, members: false } })
    expect(isFeatureEnabled('search', off)).toBe(false)
    expect(isFeatureEnabled('members', off)).toBe(false)
    expect(isFeatureEnabled('blog', off)).toBe(true)
  })

  it('has the real profile resolve, with every feature a switch', () => {
    expect(Object.keys(siteProfile.features).sort()).toEqual([...FEATURE_NAMES].sort())
  })
})

describe('hasTeamProfiles', () => {
  const profile = (features: SiteProfileInput['features']) =>
    resolveSiteProfile({ ...valid, features })

  it('is on by default', () => {
    expect(hasTeamProfiles(profile({}))).toBe(true)
  })

  it('needs the team feature and its own switch', () => {
    expect(hasTeamProfiles(profile({ teamProfiles: false }))).toBe(false)
    expect(hasTeamProfiles(profile({ team: false }))).toBe(false)
  })
})

describe('hasEvents', () => {
  const profile = (features: SiteProfileInput['features']) =>
    resolveSiteProfile({ ...valid, features })

  it('is on by default and follows the events switch', () => {
    expect(hasEvents(profile({}))).toBe(true)
    expect(hasEvents(profile({ events: false }))).toBe(false)
  })
})
