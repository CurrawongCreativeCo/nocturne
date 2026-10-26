import { describe, expect, it } from 'vitest'

import { diffProtectedFields } from '@/lib/sanity/protected-changes'

import { attributeChanges, authorsOf } from './change-authors'

const page = (extra: Record<string, unknown> = {}) => ({ _type: 'page', title: 'Home', ...extra })

describe('attributeChanges', () => {
  it('credits a protected field to the revision that changed it', () => {
    const published = page()
    const map = attributeChanges('page', published, [
      { author: 'anna', doc: page({ title: 'Start' }) },
      { author: 'ben', doc: page({ title: 'Start', access: 'members' }) },
    ])
    expect([...map]).toEqual([['access', 'ben']])
  })

  it('credits the latest author when a field is changed again', () => {
    const map = attributeChanges('page', page(), [
      { author: 'anna', doc: page({ access: 'members' }) },
      { author: 'ben', doc: page({ access: 'public' }) },
    ])
    expect([...map]).toEqual([['access', 'ben']])
  })

  it('drops a change that was undone', () => {
    const map = attributeChanges('page', page(), [
      { author: 'anna', doc: page({ access: 'members' }) },
      { author: 'anna', doc: page() },
    ])
    expect(map.size).toBe(0)
  })

  it('gives no author for a revision-less history', () => {
    expect(attributeChanges('page', page(), []).size).toBe(0)
  })
})

describe('authorsOf', () => {
  it('lists each author once', () => {
    const changes = diffProtectedFields(
      'page',
      page(),
      page({ access: 'members', minimalLayout: true }),
    )
    const map = new Map([
      ['access', 'ben'],
      ['minimalLayout', 'ben'],
    ])
    expect(authorsOf(changes, map)).toEqual(['ben'])
  })
})
