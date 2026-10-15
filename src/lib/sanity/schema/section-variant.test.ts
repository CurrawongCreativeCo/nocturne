import { describe, expect, it } from 'vitest'

import { variantField, variantSubtitle } from './section-variant'

const variants = [
  { value: 'overlay', title: 'Overlay' },
  { value: 'split', title: 'Split' },
]

describe('variantField', () => {
  it('is a radio list in the Design group that starts on the first variant', () => {
    const field = variantField(variants)
    expect(field.name).toBe('variant')
    expect(field.group).toBe('design')
    expect(field.initialValue).toBe('overlay')
    expect(field.options).toMatchObject({ layout: 'radio', list: variants })
  })
})

describe('variantSubtitle', () => {
  it('names the chosen variant', () => {
    expect(variantSubtitle('Hero', variants, 'split')).toBe('Hero · Split')
  })

  it('shows the default for an unset or unknown variant', () => {
    expect(variantSubtitle('Hero', variants, undefined)).toBe('Hero · Overlay')
    expect(variantSubtitle('Hero', variants, 'future')).toBe('Hero · Overlay')
  })
})
