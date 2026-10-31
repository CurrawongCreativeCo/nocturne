import { describe, expect, it } from 'vitest'

import { getLaunchState } from '@/config/launch'
import { resolveSiteProfile } from '@/config/profile'

import { resolveMainDocument } from './main-document'

const live = getLaunchState(resolveSiteProfile({ client: { name: 'Acme', slug: 'acme' } }), {})
const prelaunch = { ...live, status: 'prelaunch' as const, homepage: 'coming-soon' }

describe('resolveMainDocument', () => {
  it('opens Home at the live root', () => {
    expect(resolveMainDocument('/', live)?.params.slug).toBe('home')
  })

  it('opens the configured temporary page at the pre-launch root', () => {
    expect(resolveMainDocument('/', prelaunch)?.params.slug).toBe('coming-soon')
  })

  it.each(['/links', '/links/', '/services/design', '/a/b/c/d/e/f'])(
    'keeps the full CMS slug for %s in either launch state',
    (path) => {
      for (const state of [live, prelaunch]) {
        expect(resolveMainDocument(path, state)).toEqual({
          filter: '_type == "page" && slug.current == $slug',
          params: { slug: path.slice(1).replace(/\/$/, '') },
        })
      }
    },
  )

  it('opens a service for /services/<slug> only while the services feature is on', () => {
    expect(resolveMainDocument('/services/plumbing', live, { services: true })).toEqual({
      filter: '_type == "service" && slug.current == $slug',
      params: { slug: 'plumbing' },
    })
    expect(resolveMainDocument('/services/plumbing', live)).toEqual({
      filter: '_type == "page" && slug.current == $slug',
      params: { slug: 'services/plumbing' },
    })
  })

  it('opens a location for /locations/<slug> only while the locations feature is on', () => {
    expect(resolveMainDocument('/locations/parramatta', live, { locations: true })).toEqual({
      filter: '_type == "place" && slug.current == $slug',
      params: { slug: 'parramatta' },
    })
    expect(resolveMainDocument('/locations/parramatta', live, { services: true })).toEqual({
      filter: '_type == "page" && slug.current == $slug',
      params: { slug: 'locations/parramatta' },
    })
  })

  it.each([
    ['/blog/hello', 'post', 'hello'],
    ['/blog/category/news', 'category', 'news'],
    ['/team/jo/', 'teamMember', 'jo'],
    ['/events/open-day', 'event', 'open-day'],
    ['/team', 'page', 'team'],
    ['/events', 'page', 'events'],
  ])('opens the right document for %s', (path, type, slug) => {
    expect(resolveMainDocument(path, live)).toEqual({
      filter: `_type == "${type}" && slug.current == $slug`,
      params: { slug },
    })
  })

  it.each([
    '/api/draft-mode/enable',
    '/api',
    '/api/search',
    '/studio/presentation',
    '/_next/static/app.js',
    '/search',
    '/sign-in',
    '/sign-out',
    '/section-gallery',
    '/studio-brand-preview',
    '/ab/code/home',
    '/prelaunch-view/links',
    '/blog',
    '/blog/missing/nested',
    '/team/jo/nested',
    '/events/open-day/nested',
    '/robots.txt',
    '/feed.xml',
    '/sitemap/0.xml',
    '/.well-known/example',
    '/logo.svg',
    '/events/open-day.ics',
  ])('skips the lookup and missing-document warning for %s', (path) => {
    expect(resolveMainDocument(path, live)).toBeUndefined()
    expect(resolveMainDocument(path, prelaunch)).toBeUndefined()
  })
})
