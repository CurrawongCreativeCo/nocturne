import { describe, expect, it } from 'vitest'

import { buildPresetOperations, getAtPath, matchPreset, nextFocusIndex, splitPath } from './presets'

const split = {
  value: 'split',
  set: { variant: 'split', imagePosition: 'left', 'style.tone': 'alt' },
}
const centred = { value: 'centred', set: { variant: 'centred', 'style.tone': 'surface' } }

describe('splitPath', () => {
  it('splits on dots and rejects empty segments', () => {
    expect(splitPath('style.tone')).toEqual(['style', 'tone'])
    expect(splitPath('variant')).toEqual(['variant'])
    expect(() => splitPath('a..b')).toThrow(/Invalid preset field path/)
    expect(() => splitPath('')).toThrow()
  })
})

describe('getAtPath', () => {
  it('reads nested values and gives undefined for anything missing', () => {
    expect(getAtPath({ style: { tone: 'alt' } }, ['style', 'tone'])).toBe('alt')
    expect(getAtPath({ style: null }, ['style', 'tone'])).toBeUndefined()
    expect(getAtPath(undefined, ['a'])).toBeUndefined()
  })
})

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

describe('matchPreset', () => {
  const presets = [split, centred]

  it('finds the preset whose fields all match', () => {
    const value = { variant: 'split', imagePosition: 'left', style: { tone: 'alt' } }
    expect(matchPreset(presets, value)).toBe(split)
  })

  it('is Custom (null) after any one field changes', () => {
    const value = { variant: 'split', imagePosition: 'right', style: { tone: 'alt' } }
    expect(matchPreset(presets, value)).toBeNull()
  })

  it('uses defaults for fields that were never set', () => {
    expect(matchPreset(presets, {})).toBeNull()
    expect(matchPreset(presets, { variant: 'centred' }, { 'style.tone': 'surface' })).toBe(centred)
  })

  it('compares arrays and objects by content', () => {
    const p = { set: { items: [1, { a: 2 }] } }
    expect(matchPreset([p], { items: [1, { a: 2 }] })).toBe(p)
    expect(matchPreset([p], { items: [1, { a: 3 }] })).toBeNull()
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
