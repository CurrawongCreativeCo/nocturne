import { describe, expect, it } from 'vitest'

import {
  BLOG_PATH,
  categoryPath,
  HOME_SLUG,
  postPath,
  segmentsToSlug,
  slugToPath,
  slugToSegments,
} from './paths'

describe('slug <-> URL mapping', () => {
  it('maps the home slug to "/"', () => {
    expect(slugToPath(HOME_SLUG)).toBe('/')
    expect(segmentsToSlug(undefined)).toBe(HOME_SLUG)
    expect(segmentsToSlug([])).toBe(HOME_SLUG)
    expect(slugToSegments(HOME_SLUG)).toEqual([])
  })

  it('maps nested slugs to paths and back', () => {
    expect(slugToPath('services/web-design')).toBe('/services/web-design')
    expect(slugToSegments('services/web-design')).toEqual(['services', 'web-design'])
    expect(segmentsToSlug(['services', 'web-design'])).toBe('services/web-design')
  })

  it('treats a missing slug as home', () => {
    expect(slugToPath(null)).toBe('/')
    expect(slugToPath(undefined)).toBe('/')
    expect(slugToPath('')).toBe('/')
  })

  it('round-trips every slug through route params', () => {
    for (const slug of [HOME_SLUG, 'about', 'a/b/c']) {
      expect(segmentsToSlug(slugToSegments(slug))).toBe(slug)
    }
  })
})

describe('blog paths', () => {
  it('puts posts and categories under /blog', () => {
    expect(BLOG_PATH).toBe('/blog')
    expect(postPath('hello-world')).toBe('/blog/hello-world')
    expect(categoryPath('news')).toBe('/blog/category/news')
  })
})
