import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLaunchState, isPublicBeforeLaunch } from './launch'
import { resolveSiteProfile, siteProfile, type LaunchInput } from './profile'

const profileWith = (launch?: LaunchInput) =>
  resolveSiteProfile({ client: { name: 'Acme', slug: 'acme' }, launch })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getLaunchState', () => {
  it('is live with the defaults when the profile has no launch block', () => {
    expect(getLaunchState(profileWith(), {})).toEqual({
      status: 'live',
      homepage: 'links',
      publicPages: [],
      unknownPaths: 'not-found',
      visibleSlugs: ['links'],
    })
  })

  it('reads the real profile by default', () => {
    expect(getLaunchState(undefined, {}).status).toBe(siteProfile.launch.status)
  })

  it('lists the homepage first, then the public pages, without repeats', () => {
    const state = getLaunchState(
      profileWith({
        status: 'prelaunch',
        homepage: 'coming-soon',
        publicPages: ['about', 'coming-soon', 'contact'],
      }),
      {},
    )
    expect(state.visibleSlugs).toEqual(['coming-soon', 'about', 'contact'])
    // The profile's own list is left as written.
    expect(state.publicPages).toEqual(['about', 'coming-soon', 'contact'])
  })

  it('has an empty publicPages by default and only the homepage visible', () => {
    const state = getLaunchState(profileWith({ status: 'prelaunch' }), {})
    expect(state.publicPages).toEqual([])
    expect(state.visibleSlugs).toEqual(['links'])
  })

  it('carries unknownPaths through', () => {
    expect(
      getLaunchState(profileWith({ status: 'prelaunch', unknownPaths: 'homepage' }), {})
        .unknownPaths,
    ).toBe('homepage')
  })

  describe('SITE_LAUNCH_OVERRIDE', () => {
    it('turns a live profile into pre-launch, with the profile’s pages', () => {
      const state = getLaunchState(profileWith({ status: 'live', homepage: 'soon' }), {
        SITE_LAUNCH_OVERRIDE: 'prelaunch',
      })
      expect(state).toMatchObject({ status: 'prelaunch', homepage: 'soon' })
    })

    it('turns a profile with no launch block into pre-launch', () => {
      expect(getLaunchState(profileWith(), { SITE_LAUNCH_OVERRIDE: 'prelaunch' }).status).toBe(
        'prelaunch',
      )
    })

    it('leaves a pre-launch profile pre-launch', () => {
      expect(
        getLaunchState(profileWith({ status: 'prelaunch' }), { SITE_LAUNCH_OVERRIDE: 'prelaunch' })
          .status,
      ).toBe('prelaunch')
    })

    it('never reveals a site: "live" is ignored, with a warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const state = getLaunchState(profileWith({ status: 'prelaunch' }), {
        SITE_LAUNCH_OVERRIDE: 'live',
      })
      expect(state.status).toBe('prelaunch')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('never reveal')
    })

    it.each(['Prelaunch', 'PRELAUNCH', ' prelaunch', 'off', '0', 'true'])(
      'ignores %j, with a warning',
      (value) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        expect(getLaunchState(profileWith(), { SITE_LAUNCH_OVERRIDE: value }).status).toBe('live')
        expect(warn).toHaveBeenCalledTimes(1)
      },
    )

    it('does nothing, quietly, when unset or empty', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(getLaunchState(profileWith({ status: 'prelaunch' }), {}).status).toBe('prelaunch')
      expect(getLaunchState(profileWith(), { SITE_LAUNCH_OVERRIDE: '' }).status).toBe('live')
      expect(warn).not.toHaveBeenCalled()
    })
  })
})

describe('isPublicBeforeLaunch', () => {
  const state = getLaunchState(
    profileWith({
      status: 'prelaunch',
      homepage: 'links',
      publicPages: ['privacy', 'legal/terms'],
    }),
    {},
  )

  it('shows "/" (the temporary page)', () => {
    expect(isPublicBeforeLaunch('/', state)).toBe(true)
  })

  it('shows the homepage and the public pages, with or without a trailing slash', () => {
    for (const path of ['/links', '/links/', '/privacy', '/legal/terms', '/legal/terms/']) {
      expect(isPublicBeforeLaunch(path, state), path).toBe(true)
    }
  })

  it('hides every other page', () => {
    for (const path of ['/about', '/blog', '/home', '/services/web']) {
      expect(isPublicBeforeLaunch(path, state), path).toBe(false)
    }
  })

  it('matches a whole slug: a page under a public page, or a longer name, is not public', () => {
    for (const path of ['/links/more', '/linksx', '/legal', '/privacy/policy', '/legal/terms/x']) {
      expect(isPublicBeforeLaunch(path, state), path).toBe(false)
    }
  })

  it('fails closed on other spellings: slugs are lowercase and have no empty parts', () => {
    for (const path of ['/LINKS', '/Links', '//links', '/links//', '', 'links', '/ links']) {
      expect(isPublicBeforeLaunch(path, state), JSON.stringify(path)).toBe(false)
    }
  })

  it('does not treat the reserved paths as pages to show', () => {
    for (const path of ['/studio', '/api/site-info', '/_next/static/x.js', '/prelaunch-view']) {
      expect(isPublicBeforeLaunch(path, state), path).toBe(false)
    }
  })

  it('shows everything when live', () => {
    const live = getLaunchState(profileWith(), {})
    for (const path of ['/', '/about', '/blog/post', '/anything/at/all']) {
      expect(isPublicBeforeLaunch(path, live), path).toBe(true)
    }
  })

  it('with the override, hides what a live profile showed', () => {
    const hidden = getLaunchState(profileWith(), { SITE_LAUNCH_OVERRIDE: 'prelaunch' })
    expect(isPublicBeforeLaunch('/about', hidden)).toBe(false)
    expect(isPublicBeforeLaunch('/links', hidden)).toBe(true)
  })
})
