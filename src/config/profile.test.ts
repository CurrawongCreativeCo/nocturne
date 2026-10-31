import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FEATURES,
  DEFAULT_VOICE,
  FEATURE_NAMES,
  hasEvents,
  hasLocations,
  hasServices,
  hasTeamProfiles,
  isFeatureEnabled,
  resolveSiteProfile,
  siteProfile,
  validateSiteProfile,
  type SiteProfileInput,
} from './profile'
import { templateVersion } from './template-version'
import { isTemplateRepo } from '../../scripts/is-template.mjs'

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
      voice: DEFAULT_VOICE,
      features: DEFAULT_FEATURES,
      clientSections: [],
      launch: { status: 'live', homepage: 'links', publicPages: [], unknownPaths: 'not-found' },
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

  it('starts the publish gate off, like the plan-dependent features, until the profile turns it on', () => {
    expect(isFeatureEnabled('publishGate', resolveSiteProfile(valid))).toBe(false)
    expect(
      isFeatureEnabled(
        'publishGate',
        resolveSiteProfile({ ...valid, features: { publishGate: true } }),
      ),
    ).toBe(true)
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

describe('hasServices', () => {
  const profile = (features: SiteProfileInput['features']) =>
    resolveSiteProfile({ ...valid, features })

  it('is off by default and follows the services switch', () => {
    expect(hasServices(profile({}))).toBe(false)
    expect(hasServices(profile({ services: true }))).toBe(true)
  })

  it('locations are off by default, follow their switch and need Business info', () => {
    expect(hasLocations(profile({}))).toBe(false)
    expect(hasLocations(profile({ locations: true }))).toBe(true)
    expect(() => profile({ locations: true, businessInfo: false })).toThrow(
      /features\.businessInfo/,
    )
    expect(hasLocations(profile({ locations: false, businessInfo: false }))).toBe(false)
  })

  it.skipIf(!isTemplateRepo())('locations are off in the template profile', () => {
    expect(hasLocations(siteProfile)).toBe(false)
  })

  // A client site decides for itself; the template ships Services off (a plan feature).
  it.skipIf(!isTemplateRepo())('is off in the template profile', () => {
    expect(hasServices(siteProfile)).toBe(false)
  })
})

describe('launch', () => {
  const withLaunch = (launch: unknown) => ({ ...valid, launch })

  it('is live when left out, with the defaults ready', () => {
    expect(resolveSiteProfile(valid).launch).toEqual({
      status: 'live',
      homepage: 'links',
      publicPages: [],
      unknownPaths: 'not-found',
    })
  })

  // The template ships live; a client site is pre-launch on purpose until it launches.
  it.skipIf(!isTemplateRepo())('ships live', () => {
    expect(siteProfile.launch.status).toBe('live')
  })

  it('fills in the defaults around a status', () => {
    expect(resolveSiteProfile({ ...valid, launch: { status: 'prelaunch' } }).launch).toEqual({
      status: 'prelaunch',
      homepage: 'links',
      publicPages: [],
      unknownPaths: 'not-found',
    })
  })

  it('keeps what is given', () => {
    const launch = {
      status: 'prelaunch',
      homepage: 'coming-soon',
      publicPages: ['links', 'services/web'],
      unknownPaths: 'homepage',
    } as const
    expect(resolveSiteProfile({ ...valid, launch }).launch).toEqual(launch)
    expect(validateSiteProfile(withLaunch(launch))).toEqual([])
  })

  it.each([
    ['not an object', 'prelaunch', 'launch must be an object'],
    ['no status', {}, 'launch.status undefined is not one of prelaunch, live'],
    ['a bad status', { status: 'soon' }, 'launch.status "soon" is not one of prelaunch, live'],
    [
      'an uppercase homepage',
      { status: 'live', homepage: 'Links' },
      'launch.homepage "Links" is not a page slug',
    ],
    [
      'a homepage with slashes at the ends',
      { status: 'live', homepage: '/links/' },
      'launch.homepage "/links/" is not a page slug',
    ],
    [
      'the real home page',
      { status: 'prelaunch', homepage: 'home' },
      'launch.homepage cannot be "home": that is the real home page',
    ],
    [
      'a reserved homepage',
      { status: 'prelaunch', homepage: 'blog' },
      'launch.homepage "blog" starts with "blog"',
    ],
    [
      'a reserved public page',
      { status: 'prelaunch', publicPages: ['prelaunch-view/x'] },
      'launch.publicPages "prelaunch-view/x" starts with "prelaunch-view"',
    ],
    [
      'a bad public page',
      { status: 'prelaunch', publicPages: ['About us'] },
      'launch.publicPages "About us" is not a page slug',
    ],
    [
      'the home page as a public page',
      { status: 'prelaunch', publicPages: ['home'] },
      'launch.publicPages cannot be "home"',
    ],
    [
      'public pages that are not a list',
      { status: 'prelaunch', publicPages: 'links' },
      'launch.publicPages must be a list of page slugs',
    ],
    [
      'a repeated public page',
      { status: 'prelaunch', publicPages: ['about', 'about'] },
      'launch.publicPages lists "about" twice',
    ],
    [
      'a bad unknownPaths',
      { status: 'prelaunch', unknownPaths: 'redirect' },
      'launch.unknownPaths "redirect" is not one of not-found, homepage',
    ],
  ])('rejects %s', (_name, launch, message) => {
    expect(validateSiteProfile(withLaunch(launch)).join('\n')).toContain(message)
  })

  it('lets a public page repeat the homepage (it is removed later), and a homepage that does not exist yet', () => {
    expect(
      validateSiteProfile(
        withLaunch({ status: 'prelaunch', homepage: 'links', publicPages: ['links', 'about'] }),
      ),
    ).toEqual([])
  })

  it('stops resolveSiteProfile with every problem listed', () => {
    expect(() =>
      resolveSiteProfile(withLaunch({ status: 'soon', homepage: 'home' }) as SiteProfileInput),
    ).toThrow(/launch\.status[\s\S]*launch\.homepage/)
  })
})

describe('site voice', () => {
  it('resolves client guidance without sharing mutable lists', () => {
    const voice = { summary: 'Warm and direct.', do: ['Use active verbs.'], dont: ['Use hype.'] }
    const resolved = resolveSiteProfile({ ...valid, voice }).voice
    expect(resolved).toEqual(voice)
    expect(resolved.do).not.toBe(voice.do)
    expect(resolved.dont).not.toBe(voice.dont)
  })

  it.each([null, {}, { summary: ' ', do: [], dont: [] }, { summary: 'Clear.', do: [''], dont: 1 }])(
    'rejects malformed voice guidance: %j',
    (voice) => {
      expect(validateSiteProfile({ ...valid, voice }).length).toBeGreaterThan(0)
    },
  )
})
