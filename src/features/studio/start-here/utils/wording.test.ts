import { describe, expect, it } from 'vitest'

import { displayTitle, firstName, greeting, plural, welcomeLine } from './wording'
import { SINGLETON_TITLES } from '../../singleton-titles'
import { SINGLETON_TYPES } from '../../singletons'

describe('firstName and greeting', () => {
  it('uses the first word of the name', () => {
    expect(firstName('  Ann Marie Lee ')).toBe('Ann')
    expect(greeting('Ben Thompson')).toBe('Hello, Ben')
  })

  it('does not greet by an email address or an empty name', () => {
    expect(firstName('ben@example.com')).toBeNull()
    expect(firstName('   ')).toBeNull()
    expect(firstName(undefined)).toBeNull()
    expect(greeting(null)).toBe('Hello')
  })
})

describe('wording helpers', () => {
  it('names the site', () => {
    expect(welcomeLine('Acme Plumbing')).toBe(
      'Here is what is happening on the Acme Plumbing website.',
    )
  })

  it('pluralises', () => {
    expect(plural(1, 'image', 'images')).toBe('1 image')
    expect(plural(3, 'image', 'images')).toBe('3 images')
  })

  it('falls back to the type for an untitled document', () => {
    expect(displayTitle('  About us ', 'Page')).toBe('About us')
    expect(displayTitle(null, 'Page')).toBe('Untitled page')
    expect(displayTitle('', 'Blog post')).toBe('Untitled blog post')
  })

  it('names every singleton by its Structure title, titled or not', () => {
    for (const type of SINGLETON_TYPES) {
      const title = SINGLETON_TITLES[type]
      expect(title, type).toBeTruthy()
      expect(displayTitle(null, 'Anything', type)).toBe(title)
      expect(displayTitle('  ', 'Anything', type)).not.toMatch(/untitled/i)
    }
  })

  it('keeps a typed title and the type fallback for pages and posts', () => {
    expect(displayTitle('Home', 'Page', 'page')).toBe('Home')
    expect(displayTitle(null, 'Page', 'page')).toBe('Untitled page')
    expect(displayTitle(undefined, 'Blog post', 'post')).toBe('Untitled blog post')
  })
})
