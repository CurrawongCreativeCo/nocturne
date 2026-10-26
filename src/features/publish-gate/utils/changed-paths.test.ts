import { describe, expect, it } from 'vitest'

import { changedPaths } from './changed-paths'

describe('changedPaths', () => {
  it('lists nothing for equal documents and ignores bookkeeping fields', () => {
    expect(
      changedPaths({ title: 'A', _rev: '1' }, { title: 'A', _rev: '2', _updatedAt: 'x' }),
    ).toEqual([])
  })

  it('names changed, added and removed fields without their values', () => {
    expect(changedPaths({ title: 'A', old: 1 }, { title: 'B', fresh: 'secret' })).toEqual([
      'fresh',
      'old',
      'title',
    ])
  })

  it('names keyed array items by key and recurses into them', () => {
    const before = {
      pageBuilder: [
        { _key: 'a', heading: 'x' },
        { _key: 'b', heading: 'y' },
      ],
    }
    const after = {
      pageBuilder: [{ _key: 'a', heading: 'z' }, { _key: 'b', heading: 'y' }, { _key: 'c' }],
    }
    expect(changedPaths(before, after)).toEqual(['pageBuilder[a].heading', 'pageBuilder[c]'])
  })

  it('reports a reorder at the field', () => {
    const items = [{ _key: 'a' }, { _key: 'b' }]
    expect(changedPaths({ list: items }, { list: [...items].reverse() })).toEqual(['list'])
  })

  it('lists everything of a new document', () => {
    expect(changedPaths(null, { title: 'A', slug: { current: 'a' } })).toEqual(['slug', 'title'])
  })
})
