import { describe, expect, it } from 'vitest'

import { findRedirect, normalizePath } from './redirects'

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
