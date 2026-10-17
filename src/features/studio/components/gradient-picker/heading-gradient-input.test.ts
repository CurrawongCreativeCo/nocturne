import { describe, expect, it } from 'vitest'

import { brandGradients } from '@/lib/color/gradients'

import { headingGradientOptions } from './heading-gradient-input'

const brand = brandGradients([
  { name: 'Forest dusk', stops: ['#0b3d2e', '#1b2a3b'] },
  { name: 'Sunrise', stops: ['#ff0000', '#ffaa00', '#ffff00'] },
])
const builtIn = [
  { value: 'brand', title: 'Brand to ink' },
  { value: 'custom', title: 'Custom' },
]
const titles = (stored: string | null, gradients = brand) =>
  headingGradientOptions(gradients, builtIn, stored).map(({ value, title }) => [value, title])

describe('headingGradientOptions', () => {
  it('lists the Brand colours gradients by name, then Brand to ink, then Custom', () => {
    expect(titles(null)).toEqual([
      ['brand-colours:forest-dusk', 'Forest dusk'],
      ['brand-colours:sunrise', 'Sunrise'],
      ['brand', 'Brand to ink'],
      ['custom', 'Custom'],
    ])
  })

  it('is just the built-in choices while Design settings has no gradients', () => {
    expect(titles(null, [])).toEqual([
      ['brand', 'Brand to ink'],
      ['custom', 'Custom'],
    ])
  })

  it('gives each Brand colours gradient a swatch', () => {
    const [first] = headingGradientOptions(brand, builtIn, null)
    expect(typeof first?.thumbnail).toBe('function')
  })

  it('does not offer Brand to green or Brand to red, but keeps one that is stored', () => {
    expect(titles(null).flat()).not.toContain('brand-green')
    expect(titles('brand-green').at(-1)).toEqual(['brand-green', 'Brand to green (older)'])
    expect(titles('brand-red').at(-1)).toEqual(['brand-red', 'Brand to red (older)'])
  })

  it('keeps a stored Brand colours gradient that has been removed, so it can be changed', () => {
    expect(titles('brand-colours:gone').at(-1)).toEqual([
      'brand-colours:gone',
      'Not in Brand colours',
    ])
    expect(titles('brand-colours:sunrise')).toHaveLength(4)
  })

  it('does not duplicate a stored built-in choice', () => {
    expect(titles('custom')).toHaveLength(4)
    expect(titles('brand')).toHaveLength(4)
  })
})
