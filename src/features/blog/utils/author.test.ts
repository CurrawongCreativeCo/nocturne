import { describe, expect, it } from 'vitest'

import { authorName } from './author'

describe('authorName', () => {
  it('reads the name', () => {
    expect(authorName({ name: 'Ann' })).toBe('Ann')
  })

  it('survives a deleted author', () => {
    expect(authorName(null)).toBeUndefined()
    expect(authorName(undefined)).toBeUndefined()
  })
})
