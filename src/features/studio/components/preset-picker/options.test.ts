import { describe, expect, it } from 'vitest'

import { filterVisibleOptions, normalisePresetOptions, normalisePresets } from './options'

describe('normalisePresetOptions', () => {
  it('keeps value, title, description and thumbnail', () => {
    const Thumb = () => null
    expect(
      normalisePresetOptions([
        { value: 'split', title: 'Split', description: ' Image beside text ', thumbnail: '/a.svg' },
        { value: 'centred', title: 'Centred', thumbnail: Thumb },
      ]),
    ).toEqual([
      { value: 'split', title: 'Split', description: 'Image beside text', thumbnail: '/a.svg' },
      { value: 'centred', title: 'Centred', description: undefined, thumbnail: Thumb },
    ])
  })

  it('accepts bare strings and titles an untitled option by its value', () => {
    expect(normalisePresetOptions(['a', { value: 'b' }]).map(({ title }) => title)).toEqual([
      'a',
      'b',
    ])
  })

  it('drops entries without a string value, repeats, empty thumbnails and non-lists', () => {
    expect(
      normalisePresetOptions([
        null,
        3,
        { title: 'x' },
        { value: '' },
        { value: 'a' },
        { value: 'a', title: 'again' },
        { value: 'b', thumbnail: ' ' },
      ]),
    ).toEqual([
      { value: 'a', title: 'a', description: undefined, thumbnail: undefined },
      { value: 'b', title: 'b', description: undefined, thumbnail: undefined },
    ])
    expect(normalisePresetOptions(undefined)).toEqual([])
    expect(normalisePresetOptions('nope')).toEqual([])
  })

  it('accepts memo and forwardRef components', () => {
    const wrapped = { $$typeof: Symbol.for('react.memo'), type: () => null }
    expect(normalisePresetOptions([{ value: 'a', thumbnail: wrapped }])[0]?.thumbnail).toBe(wrapped)
  })
})

describe('normalisePresets', () => {
  it('keeps presets that set something, with their fields', () => {
    const presets = normalisePresets([
      { value: 'a', title: 'A', set: { variant: 'split', 'style.tone': 'alt' } },
      { value: 'empty', title: 'Empty', set: {} },
      { value: 'missing', title: 'Missing' },
    ])
    expect(presets).toHaveLength(1)
    expect(presets[0]).toMatchObject({ value: 'a', set: { variant: 'split', 'style.tone': 'alt' } })
  })
})

describe('filterVisibleOptions', () => {
  const options = normalisePresetOptions(['none', 'reveal', 'parallax'])

  it('offers everything when the field names no subset', () => {
    expect(filterVisibleOptions(options, undefined, 'none')).toEqual(options)
  })

  it('offers only the named values', () => {
    expect(filterVisibleOptions(options, ['none', 'reveal'], 'none').map((o) => o.value)).toEqual([
      'none',
      'reveal',
    ])
  })

  it('keeps the stored value even when it is no longer offered', () => {
    expect(filterVisibleOptions(options, ['none'], 'parallax').map((o) => o.value)).toEqual([
      'none',
      'parallax',
    ])
  })
})
