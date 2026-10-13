import { describe, expect, it } from 'vitest'

import { safePath } from './safe-path'

describe('safePath', () => {
  it('keeps paths on this site, with query and hash', () => {
    expect(safePath('/members')).toBe('/members')
    expect(safePath('/a/b?x=1#top')).toBe('/a/b?x=1#top')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'members',
    '',
  ])('falls back for %j', (value) => {
    expect(safePath(value)).toBe('/')
  })

  it('falls back for anything that is not a string', () => {
    expect(safePath(undefined)).toBe('/')
    expect(safePath(['/a'], '/home')).toBe('/home')
  })
})
