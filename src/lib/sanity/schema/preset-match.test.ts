import { describe, expect, it } from 'vitest'

import { getAtPath, matchPreset, splitPath } from './preset-match'

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
