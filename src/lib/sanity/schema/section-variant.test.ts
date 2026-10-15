import { describe, expect, it } from 'vitest'

import { joinSubtitle, toneTitle, variantField, variantSubtitle } from './section-variant'

const variants = [
  { value: 'overlay', title: 'Overlay', description: 'Text over a picture.' },
  { value: 'split', title: 'Split' },
]

describe('variantField', () => {
  it('is a picker, first in the Content tab, that starts on the first variant', () => {
    const field = variantField(variants)
    expect(field.name).toBe('variant')
    expect(field.group).toBe('content')
    expect(field.initialValue).toBe('overlay')
    expect(field.options).toMatchObject({ presetPicker: true, layout: 'radio', list: variants })
  })

  it('is hidden from clients and required', () => {
    const field = variantField(variants)
    expect(field.hidden).toBeTypeOf('function')
    expect(field.validation).toBeTypeOf('function')
  })
})

describe('variantSubtitle', () => {
  it('names the chosen variant and the tone', () => {
    expect(variantSubtitle('Hero', variants, 'split', 'inverse')).toBe('Hero · Split · Dark')
  })

  it('leaves out an unset tone', () => {
    expect(variantSubtitle('Hero', variants, 'split')).toBe('Hero · Split')
    expect(variantSubtitle('Hero', variants, 'split', 'future')).toBe('Hero · Split')
  })

  it('shows the default for an unset or unknown variant', () => {
    expect(variantSubtitle('Hero', variants, undefined, 'alt')).toBe('Hero · Overlay · Soft')
    expect(variantSubtitle('Hero', variants, 'future')).toBe('Hero · Overlay')
  })
})

describe('joinSubtitle and toneTitle', () => {
  it('join the parts that exist', () => {
    expect(joinSubtitle('FAQ', 0, undefined, '', null, false, 'Soft')).toBe('FAQ · 0 · Soft')
  })

  it('name each tone the way the Background picker does', () => {
    expect(['surface', 'alt', 'inverse', 'accent'].map(toneTitle)).toEqual([
      'Surface',
      'Soft',
      'Dark',
      'Accent',
    ])
    expect(toneTitle(undefined)).toBeUndefined()
  })
})
