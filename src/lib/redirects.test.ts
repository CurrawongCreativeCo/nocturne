import { describe, expect, it } from 'vitest'

import { buildRedirectMap, findRedirect, lookupRedirect, normalizePath } from './redirects'

describe('normalizePath', () => {
  it('ignores case and trailing slashes', () => {
    expect(normalizePath('/About-Us.html')).toBe('/about-us.html')
    expect(normalizePath('/promo/')).toBe('/promo')
    expect(normalizePath('/promo///')).toBe('/promo')
  })

  it('keeps the root path', () => {
    expect(normalizePath('/')).toBe('/')
  })
})

describe('findRedirect', () => {
  const redirects = [
    { source: '/About-Us.html', destination: '/about', permanent: true },
    { source: '/promo/', destination: 'https://example.com/sale', permanent: false },
  ]

  it('matches regardless of case and trailing slash, in either the rule or the request', () => {
    expect(findRedirect(redirects, '/about-us.html')?.destination).toBe('/about')
    expect(findRedirect(redirects, '/ABOUT-US.HTML/')?.destination).toBe('/about')
    expect(findRedirect(redirects, '/promo')?.permanent).toBe(false)
  })

  it('returns null when nothing matches', () => {
    expect(findRedirect(redirects, '/about-us')).toBeNull()
    expect(findRedirect([], '/anything')).toBeNull()
  })
})

describe('buildRedirectMap', () => {
  it('keys by normalized source and maps permanent to 308, temporary to 307', () => {
    expect(
      buildRedirectMap([
        { source: '/About-Us.html', destination: '/about', permanent: true },
        { source: '/promo/', destination: 'https://example.com/sale', permanent: false },
      ]),
    ).toEqual({
      '/about-us.html': { to: '/about', status: 308 },
      '/promo': { to: 'https://example.com/sale', status: 307 },
    })
  })

  it('keeps the first rule for a duplicate source and drops self-redirects', () => {
    expect(
      buildRedirectMap([
        { source: '/a', destination: '/one', permanent: true },
        { source: '/A/', destination: '/two', permanent: false },
        { source: '/loop', destination: '/Loop/', permanent: true },
      ]),
    ).toEqual({ '/a': { to: '/one', status: 308 } })
  })

  it('is empty when there are no redirects', () => {
    expect(buildRedirectMap([])).toEqual({})
  })
})

describe('lookupRedirect', () => {
  const map = buildRedirectMap([{ source: '/old', destination: '/new', permanent: true }])

  it('matches regardless of case and trailing slash', () => {
    expect(lookupRedirect(map, '/OLD/')).toEqual({ to: '/new', status: 308 })
  })

  it('returns null for misses, a missing map, and inherited property names', () => {
    expect(lookupRedirect(map, '/other')).toBeNull()
    expect(lookupRedirect(undefined, '/old')).toBeNull()
    expect(lookupRedirect(map, '/constructor')).toBeNull()
    expect(lookupRedirect(map, '/__proto__')).toBeNull()
  })
})
