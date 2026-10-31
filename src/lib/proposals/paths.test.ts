import { describe, expect, it } from 'vitest'

import { formatPath, getAt, insertAt, parsePath, setAt, unsetAt } from './paths'

const doc = {
  title: 'Home',
  items: [
    { _key: 'a', name: 'one' },
    { _key: 'b', name: 'two' },
  ],
}

const seg = (path: string) => parsePath(path) ?? []

describe('parsePath', () => {
  it('reads fields, indexes and keys', () => {
    expect(parsePath('items[_key=="a"].name')).toEqual([
      { kind: 'field', name: 'items' },
      { kind: 'key', key: 'a' },
      { kind: 'field', name: 'name' },
    ])
    expect(parsePath('items[-1]')).toEqual([
      { kind: 'field', name: 'items' },
      { kind: 'index', index: -1 },
    ])
  })

  it.each(['', '.title', '[0]', 'items[0:2]', 'items[name=="x"]', 'a..b', 'a b'])(
    'refuses %j',
    (path) => {
      expect(parsePath(path)).toBeNull()
    },
  )
})

describe('editing a copy', () => {
  it('sets, unsets and inserts without touching the original', () => {
    const items = seg('items')
    const second = seg('items[_key=="b"]')
    expect(getAt(setAt(doc, seg('items[0].name'), 'uno'), seg('items[0].name'))).toBe('uno')
    expect(unsetAt(doc, second).items).toHaveLength(1)
    expect(
      insertAt(doc, seg('items[-1]'), 'after', [{ _key: 'c' }]).items.map((i) => i._key),
    ).toEqual(['a', 'b', 'c'])
    expect(
      insertAt(doc, seg('items[0]'), 'before', [{ _key: 'z' }]).items.map((i) => i._key),
    ).toEqual(['z', 'a', 'b'])
    expect(insertAt(doc, second, 'replace', [{ _key: 'y' }]).items.map((i) => i._key)).toEqual([
      'a',
      'y',
    ])
    expect(getAt(doc, items)).toHaveLength(2)
    expect(doc.items[0]?.name).toBe('one')
  })

  it('appends to an empty array with [-1]', () => {
    const empty = { items: [] as { _key: string }[] }
    expect(insertAt(empty, seg('items[-1]'), 'after', [{ _key: 'a' }]).items).toHaveLength(1)
  })
})

describe('formatPath', () => {
  it('is the inverse of parsePath', () => {
    for (const path of ['title', 'items[_key=="a"].name', 'a.b[2].c', 'items[-1]']) {
      expect(formatPath(seg(path))).toBe(path)
    }
  })
})
