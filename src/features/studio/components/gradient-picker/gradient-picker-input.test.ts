import { describe, expect, it } from 'vitest'

import { brandGradients } from '@/lib/color/gradients'

import { gradientOptions } from './gradient-picker-input'

const gradients = brandGradients([
  { name: 'Forest dusk', stops: ['#0b3d2e', '#1b2a3b'] },
  { name: 'Sunrise', stops: ['#ff0000', '#ffaa00', '#ffff00'] },
])

describe('gradientOptions', () => {
  it('starts with None, then lists each gradient by the slug the page defines', () => {
    expect(gradientOptions(gradients, null).map(({ value, title }) => [value, title])).toEqual([
      ['', 'None'],
      ['forest-dusk', 'Forest dusk'],
      ['sunrise', 'Sunrise'],
    ])
  })

  it('gives each gradient a swatch and none to None', () => {
    const [none, ...rest] = gradientOptions(gradients, null)
    expect(none?.thumbnail).toBeUndefined()
    expect(rest.every((option) => typeof option.thumbnail === 'function')).toBe(true)
  })

  it('keeps a stored gradient that has left Design settings, so it can be cleared', () => {
    const options = gradientOptions(gradients, 'old-one')
    expect(options.at(-1)).toMatchObject({ value: 'old-one', title: 'Not in Design settings' })
    expect(gradientOptions(gradients, 'sunrise')).toHaveLength(3)
  })
})
