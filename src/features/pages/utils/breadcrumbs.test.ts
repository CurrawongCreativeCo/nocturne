import { describe, expect, it } from 'vitest'

import { buildBreadcrumbs } from './breadcrumbs'

const pages = [
  { slug: 'home', title: 'Home' },
  { slug: 'services', title: 'Services' },
  { slug: 'services/web', title: 'Web' },
  { slug: 'services/web/design', title: 'Design' },
  { slug: 'about', title: 'About' },
  { slug: 'untitled/page', title: null },
]

describe('buildBreadcrumbs', () => {
  it('lists Home, each ancestor and the page itself', () => {
    expect(buildBreadcrumbs('services/web/design', pages)).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: 'Web', path: '/services/web' },
      { name: 'Design', path: '/services/web/design' },
    ])
  })

  it('skips segments without a page', () => {
    expect(
      buildBreadcrumbs(
        'services/web/design',
        pages.filter((p) => p.slug !== 'services/web'),
      ),
    ).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: 'Design', path: '/services/web/design' },
    ])
    expect(
      buildBreadcrumbs(
        'missing/page',
        pages.filter((p) => p.slug === 'home'),
      ),
    ).toEqual([{ name: 'Home', path: '/' }])
  })

  it('skips pages without a title', () => {
    expect(buildBreadcrumbs('untitled/page', pages)).toEqual([{ name: 'Home', path: '/' }])
  })

  it('has no trail for Home or top-level pages', () => {
    expect(buildBreadcrumbs('home', pages)).toEqual([])
    expect(buildBreadcrumbs('about', pages)).toEqual([])
  })
})
