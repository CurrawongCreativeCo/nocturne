import { describe, expect, it } from 'vitest'

import { socialTitle } from './social'

describe('socialTitle', () => {
  it('names the platform as editors pick it', () => {
    expect(socialTitle('linkedin')).toBe('LinkedIn')
    expect(socialTitle('x')).toBe('X')
  })

  it('falls back for an unknown or missing platform', () => {
    expect(socialTitle('myspace')).toBe('Profile')
    expect(socialTitle(null)).toBe('Profile')
  })
})
