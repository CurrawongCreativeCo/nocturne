import { describe, expect, it } from 'vitest'

import {
  buildRedirectDocument,
  detectAddressChange,
  documentPath,
  joinUrl,
  needsPublishConfirmation,
  planRedirect,
  readSlug,
} from './publish-redirect'

describe('readSlug', () => {
  it('reads slug.current', () => {
    expect(readSlug({ slug: { current: 'about' } })).toBe('about')
  })
  it.each([null, undefined, {}, { slug: null }, { slug: {} }, { slug: { current: '' } }])(
    'returns null for %j',
    (doc) => {
      expect(readSlug(doc)).toBeNull()
    },
  )
})

describe('documentPath', () => {
  it('maps pages and posts', () => {
    expect(documentPath('page', 'services/web')).toBe('/services/web')
    expect(documentPath('page', 'home')).toBe('/')
    expect(documentPath('post', 'hello')).toBe('/blog/hello')
  })
  it('has no path for other types or empty slugs', () => {
    expect(documentPath('author', 'jo')).toBeNull()
    expect(documentPath('page', null)).toBeNull()
  })
})

describe('joinUrl', () => {
  it('joins without doubling slashes', () => {
    expect(joinUrl('https://example.com.au/', '/about')).toBe('https://example.com.au/about')
    expect(joinUrl('https://example.com.au', '/')).toBe('https://example.com.au/')
  })
})

describe('detectAddressChange', () => {
  it('reports a changed page address', () => {
    expect(detectAddressChange('page', 'about', 'about-us')).toEqual({
      from: '/about',
      to: '/about-us',
    })
  })
  it('uses the blog path for posts', () => {
    expect(detectAddressChange('post', 'a', 'b')).toEqual({ from: '/blog/a', to: '/blog/b' })
  })
  it('is null without a published version, with the same slug, or for a case-only change', () => {
    expect(detectAddressChange('page', null, 'about')).toBeNull()
    expect(detectAddressChange('page', 'about', 'about')).toBeNull()
    expect(detectAddressChange('page', 'about', 'About')).toBeNull()
    expect(detectAddressChange('page', 'about', null)).toBeNull()
  })
  it('handles moving to or from the home page', () => {
    expect(detectAddressChange('page', 'home', 'welcome')).toEqual({ from: '/', to: '/welcome' })
  })
})

describe('needsPublishConfirmation', () => {
  it('asks before a first publish', () => {
    expect(needsPublishConfirmation(false, null)).toBe(true)
  })

  it('asks when the address changes', () => {
    expect(needsPublishConfirmation(true, { from: '/old', to: '/new' })).toBe(true)
  })

  it('publishes an edit at the same address straight away', () => {
    expect(needsPublishConfirmation(true, null)).toBe(false)
  })
})

describe('planRedirect', () => {
  const change = { from: '/about', to: '/about-us' }
  const rule = (id: string, source: string, destination: string) => ({ id, source, destination })

  it('creates when nothing conflicts', () => {
    expect(planRedirect([], change)).toEqual({ kind: 'create', chained: [] })
  })
  it('refuses a duplicate source, ignoring case and trailing slashes', () => {
    expect(planRedirect([rule('r', '/About/', '/elsewhere')], change)).toEqual({
      kind: 'duplicate',
      destination: '/elsewhere',
    })
  })
  it('refuses a loop', () => {
    const plan = planRedirect([rule('r', '/about-us', '/about')], change)
    expect(plan).toEqual({ kind: 'loop', path: ['/about', '/about-us', '/about'] })
  })
  it('refuses a longer loop', () => {
    const plan = planRedirect(
      [rule('a', '/about-us', '/team'), rule('b', '/team', '/about')],
      change,
    )
    expect(plan.kind).toBe('loop')
  })
  it('ignores an unrelated existing loop', () => {
    const existing = [rule('a', '/x', '/y'), rule('b', '/y', '/x')]
    expect(planRedirect(existing, change)).toEqual({ kind: 'create', chained: [] })
  })
  it('lists redirects that will now take an extra hop', () => {
    expect(planRedirect([rule('r', '/old-about', '/about')], change)).toEqual({
      kind: 'create',
      chained: ['/old-about'],
    })
  })
  it('ignores external destinations', () => {
    expect(planRedirect([rule('r', '/x', 'https://example.com/about')], change).kind).toBe('create')
  })
})

describe('buildRedirectDocument', () => {
  it('builds a permanent redirect', () => {
    expect(buildRedirectDocument({ from: '/about', to: '/about-us' })).toEqual({
      _type: 'redirect',
      source: '/about',
      destination: '/about-us',
      permanent: true,
    })
  })
})
