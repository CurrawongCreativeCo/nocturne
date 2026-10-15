import { describe, expect, it } from 'vitest'

import { MEMBER_SLUG_PATTERN, slugifyMember } from './slug'

describe('slugifyMember', () => {
  it('makes a single path segment from a name', () => {
    expect(slugifyMember('Ann Lee-Smith')).toBe('ann-lee-smith')
    expect(slugifyMember('  Dr. Ann  Lee ')).toBe('dr-ann-lee')
  })

  it('drops accents and slashes', () => {
    expect(slugifyMember('José Núñez')).toBe('jose-nunez')
    expect(slugifyMember('a/b')).toBe('a-b')
  })

  it('always produces something the pattern accepts, or nothing', () => {
    for (const name of ['Ann Lee', 'O’Brien', 'Zoë 2']) {
      expect(MEMBER_SLUG_PATTERN.test(slugifyMember(name))).toBe(true)
    }
    expect(slugifyMember('***')).toBe('')
  })
})

describe('MEMBER_SLUG_PATTERN', () => {
  it('rejects paths, capitals and stray hyphens', () => {
    for (const bad of ['a/b', 'Ann', '-ann', 'ann-', 'ann--lee', '']) {
      expect(MEMBER_SLUG_PATTERN.test(bad), bad).toBe(false)
    }
  })
})
