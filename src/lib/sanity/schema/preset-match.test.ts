import { describe, expect, it } from 'vitest'

import {
  describePresetState,
  getAtPath,
  matchPreset,
  presetStateText,
  splitPath,
} from './preset-match'

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

describe('describePresetState', () => {
  const presets = [
    { title: 'Split', ...split },
    { title: 'Centred', ...centred },
  ]

  it('is on a preset while all its fields match', () => {
    const state = describePresetState(presets, {
      variant: 'centred',
      style: { tone: 'surface' },
    })
    expect(state.preset?.value).toBe('centred')
    expect(state.differences).toEqual([])
    expect(presetStateText(state)).toBe('Centred')
  })

  it('names the nearest preset and the fields that moved when Custom', () => {
    const state = describePresetState(presets, {
      variant: 'split',
      imagePosition: 'left',
      style: { tone: 'inverse' },
    })
    expect(state.preset).toBeNull()
    expect(state.nearest?.value).toBe('split')
    expect(state.differences).toEqual(['style.tone'])
    expect(presetStateText(state, { 'style.tone': 'tone' })).toBe(
      'Custom · based on Split · 1 change (tone)',
    )
  })

  it('lets defaults stand in for unset fields, and breaks ties towards the earlier preset', () => {
    expect(
      describePresetState(presets, {}, { variant: 'centred', 'style.tone': 'surface' }).preset
        ?.value,
    ).toBe('centred')
    expect(describePresetState(presets, {}).nearest?.value).toBe('centred')
  })

  it('has no state without presets', () => {
    const state = describePresetState([], {})
    expect(state).toEqual({ preset: null, nearest: null, differences: [] })
    expect(presetStateText(state)).toBe('Custom')
  })
})
