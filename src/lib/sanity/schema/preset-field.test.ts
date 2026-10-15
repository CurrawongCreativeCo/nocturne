import { describe, expect, it } from 'vitest'

import { presetField, presetsOption } from './preset-field'

const options = [
  { value: 'split', title: 'Split', description: 'Picture beside text', thumbnail: '/split.svg' },
  { value: 'centred', title: 'Centred' },
]

describe('presetField', () => {
  const field = presetField({ name: 'variant', title: 'Layout', group: 'design', options })

  it('is a string field the Studio shows as a picker', () => {
    expect(field.type).toBe('string')
    expect(field.options).toMatchObject({ presetPicker: true, layout: 'radio' })
  })

  it('keeps every option, with its description and thumbnail, in options.list', () => {
    expect(field.options.list).toEqual(options)
  })

  it('defaults to the first option, and can be told otherwise', () => {
    expect(field.initialValue).toBe('split')
    expect(presetField({ name: 'v', options, initialValue: 'centred' }).initialValue).toBe(
      'centred',
    )
  })

  it('is required unless told otherwise', () => {
    expect(field.validation).toBeTypeOf('function')
    expect(presetField({ name: 'v', options, required: false }).validation).toBeUndefined()
  })
})

describe('presetsOption', () => {
  it('wraps the presets as an object type option', () => {
    const presets = [{ value: 'a', title: 'A', set: { variant: 'split' } }]
    expect(presetsOption(presets)).toEqual({ presets })
  })
})
