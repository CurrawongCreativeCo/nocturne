import { describe, expect, it } from 'vitest'

import { buildRecentChanges, isTypeShown, type ChangedDocument } from './recent'

const doc = (
  _id: string,
  _type: string,
  _updatedAt: string,
  title: string | null = _id,
): ChangedDocument => ({
  _id,
  _type,
  _updatedAt,
  title,
})
const all = () => true

describe('buildRecentChanges', () => {
  it('lists each document once, newest first, with the draft winning', () => {
    const result = buildRecentChanges(
      [
        doc('drafts.a', 'page', '2026-10-14T00:00:00Z', 'A (draft)'),
        doc('b', 'post', '2026-10-13T00:00:00Z'),
        doc('a', 'page', '2026-10-01T00:00:00Z', 'A'),
      ],
      all,
    )
    expect(result).toEqual([
      {
        id: 'a',
        type: 'page',
        title: 'A (draft)',
        updatedAt: '2026-10-14T00:00:00Z',
        isDraft: true,
      },
      { id: 'b', type: 'post', title: 'b', updatedAt: '2026-10-13T00:00:00Z', isDraft: false },
    ])
  })

  it('keeps at most eight', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      doc(`p${i}`, 'page', `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    )
    const result = buildRecentChanges(rows, all)
    expect(result).toHaveLength(8)
    expect(result[0]?.id).toBe('p11')
  })

  it('skips types that are not shown', () => {
    const result = buildRecentChanges(
      [doc('r', 'redirect', '2026-10-14T00:00:00Z')],
      (t) => t !== 'redirect',
    )
    expect(result).toEqual([])
  })
})

describe('isTypeShown', () => {
  const visible = () => true
  it('shows clients only the types in their sidebar', () => {
    expect(isTypeShown('page', 'editor', visible)).toBe(true)
    expect(isTypeShown('businessInfo', 'contributor', visible)).toBe(true)
    expect(isTypeShown('redirect', 'editor', visible)).toBe(false)
    expect(isTypeShown('sharedSection', 'editor', visible)).toBe(false)
  })

  it('shows staff everything the profile has not hidden', () => {
    expect(isTypeShown('redirect', 'agency', visible)).toBe(true)
    expect(isTypeShown('post', 'agency', (type) => type !== 'post')).toBe(false)
    expect(isTypeShown('post', 'editor', (type) => type !== 'post')).toBe(false)
  })
})
