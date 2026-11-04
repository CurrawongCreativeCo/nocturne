import { describe, expect, it } from 'vitest'

import { buildBreadcrumb } from './page-breadcrumb'

const pages = [
  { _id: 'services', slug: 'services' },
  { _id: 'drafts.services', slug: 'services' },
  { _id: 'drafts.services-web', slug: 'services/web' },
  { _id: 'orphan', slug: 'a/b/c' },
  { _id: 'noslug' },
]

describe('buildBreadcrumb', () => {
  it('shows only the current page for a top-level page', () => {
    expect(buildBreadcrumb('about', pages)).toEqual([{ label: 'about', current: true }])
  })

  it('links each existing ancestor by its published id', () => {
    expect(buildBreadcrumb('services/web/design', pages)).toEqual([
      { label: 'services', id: 'services' },
      { label: 'web', id: 'services-web' },
      { label: 'design', current: true },
    ])
  })

  it('leaves ancestors with no page as plain text', () => {
    expect(buildBreadcrumb('a/b/c', pages)).toEqual([
      { label: 'a' },
      { label: 'b' },
      { label: 'c', current: true },
    ])
  })

  it('labels the home page "Home"', () => {
    expect(buildBreadcrumb('home', pages)).toEqual([{ label: 'Home', current: true }])
  })

  it('returns null without a slug', () => {
    expect(buildBreadcrumb(undefined, pages)).toBeNull()
    expect(buildBreadcrumb('', pages)).toBeNull()
  })
})
