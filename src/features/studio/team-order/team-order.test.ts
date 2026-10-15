import { describe, expect, it } from 'vitest'

import { moveItem, orderWrites, toRows, type TeamRow } from './team-order'

const row = (id: string, order: number | null, extra: Partial<TeamRow> = {}): TeamRow => ({
  id,
  name: id,
  role: null,
  order,
  hasPublished: true,
  hasDraft: false,
  ...extra,
})

describe('toRows', () => {
  it('lists by order, then members without one by name', () => {
    const rows = toRows([
      { _id: 'c', name: 'Cy' },
      { _id: 'b', name: 'Bo', order: 2 },
      { _id: 'a', name: 'Al', order: 1 },
      { _id: 'd', name: 'Abe' },
    ])
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'd', 'c'])
  })

  it('shows one row for a published member with a draft, preferring the draft’s fields', () => {
    for (const docs of [
      [
        { _id: 'a', name: 'Old name', order: 1 },
        { _id: 'drafts.a', name: 'New name', order: 3 },
      ],
      [
        { _id: 'drafts.a', name: 'New name', order: 3 },
        { _id: 'a', name: 'Old name', order: 1 },
      ],
    ]) {
      expect(toRows(docs)).toEqual([
        { id: 'a', name: 'New name', role: null, order: 3, hasPublished: true, hasDraft: true },
      ])
    }
  })

  it('keeps a member who only has a draft, and names the unnamed', () => {
    expect(toRows([{ _id: 'drafts.z', name: null }])).toEqual([
      { id: 'z', name: 'Untitled', role: null, order: null, hasPublished: false, hasDraft: true },
    ])
  })
})

describe('moveItem', () => {
  it('moves an item without changing the original', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ignores a move to the same place or off the ends', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, 2)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('orderWrites', () => {
  it('writes nothing when the numbers already match', () => {
    expect(orderWrites([row('a', 1), row('b', 2)])).toEqual([])
  })

  it('numbers from 1 and writes only what changed', () => {
    expect(orderWrites([row('b', 2), row('a', 1), row('c', 3)])).toEqual([
      { ids: ['b'], order: 1 },
      { ids: ['a'], order: 2 },
    ])
  })

  it('numbers members who had no order', () => {
    expect(orderWrites([row('a', null), row('b', null)])).toEqual([
      { ids: ['a'], order: 1 },
      { ids: ['b'], order: 2 },
    ])
  })

  it('patches both versions so a later publish keeps the order, and only the draft of an unpublished member', () => {
    expect(
      orderWrites([
        row('a', null, { hasDraft: true }),
        row('b', null, { hasPublished: false, hasDraft: true }),
      ]),
    ).toEqual([
      { ids: ['a', 'drafts.a'], order: 1 },
      { ids: ['drafts.b'], order: 2 },
    ])
  })
})
