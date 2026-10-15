import { describe, expect, it } from 'vitest'

import { GRADIENT_SLUG_PATTERN, brandGradients, slugify } from './gradients'

describe('slugify', () => {
  it('lowercases, hyphenates and trims', () => {
    expect(slugify('  Forest Dusk! ')).toBe('forest-dusk')
    expect(slugify('A'.repeat(40))).toHaveLength(32)
  })
})

describe('brandGradients', () => {
  it('names each gradient by its slug and writes its CSS', () => {
    expect(
      brandGradients([{ name: 'Forest dusk', angle: 135, stops: ['#0B6E4F', '#1b3a4b'] }]),
    ).toEqual([
      {
        slug: 'forest-dusk',
        name: 'Forest dusk',
        angle: 135,
        stops: ['#0b6e4f', '#1b3a4b'],
        css: 'linear-gradient(135deg, #0b6e4f, #1b3a4b)',
      },
    ])
  })

  it('keeps slugs unique and falls back to the position', () => {
    const slugs = brandGradients([
      { name: 'Sun', stops: ['#ff0000', '#00ff00'] },
      { name: 'sun', stops: ['#ff0000', '#00ff00'] },
      { name: '', stops: ['#ff0000', '#00ff00'] },
    ]).map(({ slug }) => slug)
    expect(slugs).toEqual(['sun', 'sun-2', 'gradient-3'])
    for (const slug of slugs) expect(slug).toMatch(GRADIENT_SLUG_PATTERN)
  })

  it('skips entries that cannot be drawn, and defaults and wraps the angle', () => {
    const found = brandGradients([
      null,
      { name: 'One stop', stops: ['#ff0000'] },
      { name: 'Bad colour', stops: ['#ff0000', 'red'] },
      { name: 'Four', stops: ['#111111', '#222222', '#333333', '#444444'] },
      { name: 'No angle', stops: ['#111111', '#222222'] },
      { name: 'Wrapped', angle: -90, stops: ['#111111', '#222222', '#333333'] },
    ])
    expect(found.map(({ slug, angle }) => [slug, angle])).toEqual([
      ['no-angle', 135],
      ['wrapped', 270],
    ])
  })

  it('returns none for no settings', () => {
    expect(brandGradients(undefined)).toEqual([])
    expect(brandGradients(null)).toEqual([])
  })
})
