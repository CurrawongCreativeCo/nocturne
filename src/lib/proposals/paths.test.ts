import { describe, expect, it } from 'vitest'

import {
  formatPath,
  getAt,
  insertAt,
  missingObjectParents,
  parsePath,
  setAt,
  setCreatingParents,
  unsetAt,
} from './paths'

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

describe('setting through parents that are missing', () => {
  const root = { a: { b: 1 }, text: 'x', list: [{ _key: 'k' }] }

  it('lists the object fields a set creates, outermost first', () => {
    expect(missingObjectParents(root, seg('style.panel')).map(formatPath)).toEqual(['style'])
    expect(missingObjectParents(root, seg('x.y.z')).map(formatPath)).toEqual(['x', 'x.y'])
    expect(missingObjectParents(root, seg('a.b'))).toEqual([])
  })

  it('does not list what cannot be created: a missing list member, or a field of a list member', () => {
    expect(missingObjectParents(root, seg('list[_key=="nope"].design.border'))).toEqual([])
    expect(missingObjectParents(root, seg('missing[_key=="k"].x'))).toEqual([])
  })

  it('creates them, leaving the original alone', () => {
    const next = setCreatingParents(root, seg('style.panel'), 'glass')
    expect(getAt(next, seg('style.panel'))).toBe('glass')
    expect(getAt(root, seg('style'))).toBeUndefined()
  })

  it('still throws when the value has nowhere to land', () => {
    expect(() => setCreatingParents(root, seg('text.panel'), 1)).toThrow()
    expect(() => setCreatingParents(root, seg('list[_key=="nope"].design.border'), 1)).toThrow()
    expect(() => setCreatingParents(root, seg('missing[_key=="k"].x'), 1)).toThrow()
  })

  it('treats unsetting a value that is not there as a no-op, whatever its parent is', () => {
    expect(unsetAt(root, seg('style.panel'))).toEqual(root)
    expect(unsetAt(root, seg('text.panel'))).toEqual(root)
  })
})

describe('formatPath', () => {
  it('is the inverse of parsePath', () => {
    for (const path of ['title', 'items[_key=="a"].name', 'a.b[2].c', 'items[-1]']) {
      expect(formatPath(seg(path))).toBe(path)
    }
  })
})
