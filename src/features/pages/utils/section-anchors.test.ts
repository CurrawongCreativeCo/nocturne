import { describe, expect, it } from 'vitest'

import { findDuplicateAnchors } from './section-anchors'

const section = (_key: string, anchorId?: string | null) => ({ _key, style: { anchorId } })

describe('findDuplicateAnchors', () => {
  it('finds nothing when every anchor is unique or unset', () => {
    expect(
      findDuplicateAnchors([
        section('a', 'pricing'),
        section('b', 'faq'),
        section('c'),
        section('d', ''),
      ]),
    ).toEqual([])
    expect(findDuplicateAnchors(undefined)).toEqual([])
    expect(findDuplicateAnchors([{ _key: 'a' }, null])).toEqual([])
  })

  it('reports each later section that reuses an anchor', () => {
    expect(
      findDuplicateAnchors([
        section('a', 'pricing'),
        section('b', 'faq'),
        section('c', 'pricing'),
        section('d', 'pricing'),
      ]),
    ).toEqual([
      { key: 'c', anchorId: 'pricing' },
      { key: 'd', anchorId: 'pricing' },
    ])
  })
})
