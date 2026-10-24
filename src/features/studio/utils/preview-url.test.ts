import {
  urlSearchParamPreviewPathname,
  urlSearchParamPreviewPerspective,
  urlSearchParamPreviewSecret,
} from '@sanity/preview-url-secret/constants'
import { describe, expect, it } from 'vitest'

import {
  enableUrl,
  ENABLE_PATH,
  isPreviewType,
  PATHNAME_PARAM,
  PERSPECTIVE_PARAM,
  previewPath,
  SECRET_PARAM,
} from './preview-url'

describe('previewPath', () => {
  it('maps pages to their path', () => {
    expect(previewPath('page', 'about')).toBe('/about')
  })

  it('keeps nested slugs whole', () => {
    expect(previewPath('page', 'services/web-design')).toBe('/services/web-design')
  })

  it('maps the home page to /', () => {
    expect(previewPath('page', 'home')).toBe('/')
  })

  it('maps posts under /blog', () => {
    expect(previewPath('post', 'hello-world')).toBe('/blog/hello-world')
  })

  it('has no path without a slug', () => {
    expect(previewPath('page', undefined)).toBeNull()
    expect(previewPath('page', '')).toBeNull()
    expect(previewPath('post', '  ')).toBeNull()
    expect(previewPath('post', null)).toBeNull()
  })

  it('ignores stray slashes', () => {
    expect(previewPath('page', '/about/')).toBe('/about')
  })
})

describe('enableUrl', () => {
  it('goes through the enable route with the secret, drafts perspective and path', () => {
    const url = new URL(enableUrl('https://example.com.au', '/blog/a b', 's3cret'))
    expect(url.origin).toBe('https://example.com.au')
    expect(url.pathname).toBe(ENABLE_PATH)
    expect(url.searchParams.get(SECRET_PARAM)).toBe('s3cret')
    expect(url.searchParams.get(PERSPECTIVE_PARAM)).toBe('drafts')
    expect(url.searchParams.get(PATHNAME_PARAM)).toBe('/blog/a b')
  })

  it('uses the parameter names the package validates', () => {
    expect(SECRET_PARAM).toBe(urlSearchParamPreviewSecret)
    expect(PATHNAME_PARAM).toBe(urlSearchParamPreviewPathname)
    expect(PERSPECTIVE_PARAM).toBe(urlSearchParamPreviewPerspective)
  })
})

describe('isPreviewType', () => {
  it('is true for pages and posts only', () => {
    expect(isPreviewType('page')).toBe(true)
    expect(isPreviewType('post')).toBe(true)
    expect(isPreviewType('event')).toBe(false)
  })
})
