import { describe, expect, it } from 'vitest'

import { getLaunchState } from '@/config/launch'
import { resolveSiteProfile, type LaunchInput } from '@/config/profile'

import {
  PRELAUNCH_NOT_FOUND_PATH,
  decidePrelaunch,
  isHtmlPagePath,
  prelaunchViewPath,
} from './prelaunch-gate'

const stateOf = (launch: LaunchInput) =>
  getLaunchState(resolveSiteProfile({ client: { name: 'Acme', slug: 'acme' }, launch }), {})
const prelaunch = stateOf({ status: 'prelaunch', publicPages: ['privacy', 'legal/terms'] })
const decide = (pathname: string, extra: { pass?: boolean; state?: typeof prelaunch } = {}) =>
  decidePrelaunch({
    pathname,
    hasValidPreviewPass: extra.pass ?? false,
    state: extra.state ?? prelaunch,
  })

describe('decidePrelaunch', () => {
  it('passes everything when the site is live', () => {
    const live = stateOf({ status: 'live' })
    for (const path of ['/', '/about', '/prelaunch-view/links', '/blog/x']) {
      expect(decide(path, { state: live }), path).toBe('pass')
    }
  })

  it('serves "/" and the public pages through the bare view', () => {
    for (const path of ['/', '/links', '/privacy', '/legal/terms']) {
      expect(decide(path), path).toBe('rewrite-view')
    }
  })

  it('answers 404 to every other page', () => {
    for (const path of [
      '/about',
      '/blog',
      '/blog/post',
      '/team/ann',
      '/search',
      '/sign-in',
      '/home',
    ]) {
      expect(decide(path), path).toBe('not-found')
    }
  })

  it('matches whole slugs and fails closed on other spellings', () => {
    for (const path of [
      '/links/more',
      '/linksx',
      '/Links',
      '/LINKS',
      '/Links/',
      '//links',
      '/legal',
    ]) {
      expect(decide(path), path).toBe('not-found')
    }
  })

  it('refuses a direct request for the bare view, whatever follows', () => {
    for (const path of [
      '/prelaunch-view',
      '/prelaunch-view/',
      '/prelaunch-view/links',
      '/prelaunch-view/about',
      '/prelaunch-view/__not-found__',
    ]) {
      expect(decide(path), path).toBe('not-found')
    }
  })

  it('does not take a path that merely starts with the same letters for the view', () => {
    expect(decide('/prelaunch-viewer')).toBe('not-found')
  })

  it('refuses the A/B paths too (variants are skipped before launch)', () => {
    expect(decide('/ab/abc/about')).toBe('not-found')
    expect(decide('/ab/abc')).toBe('not-found')
  })

  it('lets a valid preview pass through unchanged', () => {
    for (const path of ['/about', '/blog/post', '/', '/links']) {
      expect(decide(path, { pass: true }), path).toBe('pass')
    }
  })

  it('still refuses the view address itself... unless the pass is valid', () => {
    expect(decide('/prelaunch-view/links', { pass: true })).toBe('pass')
  })

  describe("unknownPaths: 'homepage'", () => {
    const state = stateOf({
      status: 'prelaunch',
      unknownPaths: 'homepage',
      publicPages: ['privacy'],
    })

    it('sends unknown page paths to the temporary page', () => {
      for (const path of ['/about', '/old-page', '/blog/2019/post', '/Links', '/services/web']) {
        expect(decide(path, { state }), path).toBe('redirect-home')
      }
    })

    it('still serves "/" and the public pages', () => {
      expect(decide('/', { state })).toBe('rewrite-view')
      expect(decide('/privacy', { state })).toBe('rewrite-view')
    })

    it('answers 404 to files, and to the bare view, rather than redirecting', () => {
      for (const path of [
        '/events/open-day.ics',
        '/photo.jpg',
        '/feed.xml',
        '/prelaunch-view/links',
      ]) {
        expect(decide(path, { state }), path).toBe('not-found')
      }
    })

    it('treats a legacy .html path as a page', () => {
      expect(decide('/old.html', { state })).toBe('redirect-home')
    })
  })
})

describe('isHtmlPagePath', () => {
  it('is true for pages and false for files', () => {
    expect(isHtmlPagePath('/')).toBe(true)
    expect(isHtmlPagePath('/about')).toBe(true)
    expect(isHtmlPagePath('/a.b/c')).toBe(true)
    expect(isHtmlPagePath('/page.HTML')).toBe(true)
    expect(isHtmlPagePath('/a/b.ics')).toBe(false)
    expect(isHtmlPagePath('/.well-known/x')).toBe(false)
  })
})

describe('prelaunchViewPath', () => {
  it('maps "/" to the homepage and a public page to itself', () => {
    expect(prelaunchViewPath('/', 'links')).toBe('/prelaunch-view/links')
    expect(prelaunchViewPath('/', 'welcome/soon')).toBe('/prelaunch-view/welcome/soon')
    expect(prelaunchViewPath('/privacy', 'links')).toBe('/prelaunch-view/privacy')
    expect(prelaunchViewPath('/legal/terms', 'links')).toBe('/prelaunch-view/legal/terms')
    expect(prelaunchViewPath('/links/', 'links')).toBe('/prelaunch-view/links')
  })

  it('has a not-found path no page slug can be', () => {
    expect(PRELAUNCH_NOT_FOUND_PATH).toBe('/prelaunch-view/__not-found__')
  })
})
