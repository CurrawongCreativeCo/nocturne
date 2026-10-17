import { describe, expect, it } from 'vitest'

import { buildPresetOperations, nextFocusIndex } from './presets'

const split = {
  value: 'split',
  set: { variant: 'split', imagePosition: 'left', 'style.tone': 'alt' },
}

describe('buildPresetOperations', () => {
  it('sets each field, creating a missing parent object first', () => {
    expect(
      buildPresetOperations(split, { variant: 'centred' }, { typeAt: () => 'sectionStyle' }),
    ).toEqual([
      { type: 'setIfMissing', path: ['style'], value: { _type: 'sectionStyle' } },
      { type: 'set', path: ['variant'], value: 'split' },
      { type: 'set', path: ['imagePosition'], value: 'left' },
      { type: 'set', path: ['style', 'tone'], value: 'alt' },
    ])
  })

  it('does not recreate a parent that exists, and creates a shared parent once', () => {
    const ops = buildPresetOperations({ set: { 'a.b': 1, 'a.c': 2 } }, {})
    expect(ops.filter(({ type }) => type === 'setIfMissing')).toEqual([
      { type: 'setIfMissing', path: ['a'], value: {} },
    ])
    expect(
      buildPresetOperations({ set: { 'a.b': 1 } }, { a: { b: 0 } }).map(({ type }) => type),
    ).toEqual(['set'])
  })

  it('leaves fields that already hold the value alone, so applying twice changes nothing', () => {
    const applied = { variant: 'split', imagePosition: 'left', style: { tone: 'alt' } }
    expect(buildPresetOperations(split, applied)).toEqual([])
  })

  it('can set a field to a falsy value or clear it with null', () => {
    expect(buildPresetOperations({ set: { flag: false } }, { flag: true })).toEqual([
      { type: 'set', path: ['flag'], value: false },
    ])
  })
})

describe('nextFocusIndex', () => {
  it('moves with the arrows and wraps', () => {
    expect(nextFocusIndex('ArrowRight', 0, 3)).toBe(1)
    expect(nextFocusIndex('ArrowDown', 2, 3)).toBe(0)
    expect(nextFocusIndex('ArrowLeft', 0, 3)).toBe(2)
    expect(nextFocusIndex('ArrowUp', 1, 3)).toBe(0)
  })
  it('jumps to the ends and ignores other keys', () => {
    expect(nextFocusIndex('Home', 2, 3)).toBe(0)
    expect(nextFocusIndex('End', 0, 3)).toBe(2)
    expect(nextFocusIndex('a', 0, 3)).toBeNull()
    expect(nextFocusIndex('ArrowRight', 0, 0)).toBeNull()
  })
})
