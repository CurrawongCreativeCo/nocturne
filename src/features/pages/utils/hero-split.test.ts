import { describe, expect, it } from 'vitest'

import { IMAGE_APPEARANCES } from '@/lib/sanity/image-design-options'

import {
  SPLIT_PROPORTIONS,
  splitColumns,
  splitImageClass,
  splitImageFrameClass,
  splitImageShape,
  splitImageShapeClass,
  splitImageShare,
  splitProportion,
} from './hero-split'

describe('hero split options', () => {
  it('falls back to the original look for an unset or unknown value', () => {
    expect(splitProportion(undefined)).toBe('even')
    expect(splitProportion('wide')).toBe('even')
    expect(splitImageShape(null)).toBe('rounded')
    expect(splitImageShape('hexagon')).toBe('rounded')
    expect(splitImageShape('circle')).toBe('circle')
  })

  it('gives the text the wider column when asked, on whichever side it ends up', () => {
    expect(splitColumns('text', false)).toBe('lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')
    expect(splitColumns('text', true)).toBe('lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]')
    expect(splitColumns('image', false)).toBe('lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]')
    expect(splitColumns('image', true)).toBe('lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')
    expect(splitColumns('even', true)).toBe('lg:grid-cols-2')
  })

  it('gives every proportion a column pair and a size for the image', () => {
    for (const proportion of SPLIT_PROPORTIONS) {
      expect(splitColumns(proportion, false)).toMatch(/^lg:grid-cols-/)
      expect(splitImageShare(proportion)).toBeGreaterThanOrEqual(40)
    }
    expect(splitImageShare('image')).toBeGreaterThan(splitImageShare('text'))
  })

  it('centres and caps the circle and the arch, and gives the rest the full column at a limited height', () => {
    expect(splitImageClass('circle')).toContain('max-w-xl')
    expect(splitImageClass('arch')).toContain('max-w-lg')
    for (const shape of ['standard', 'rounded', 'square', 'framed'] as const) {
      expect(splitImageClass(shape)).toBe('w-full max-h-96 lg:max-h-none')
    }
  })

  it('leaves the shape itself (corners, ratio, crop) to the shared framed image', () => {
    for (const shape of IMAGE_APPEARANCES) {
      expect(splitImageClass(shape)).not.toMatch(/rounded|aspect|object-cover/)
    }
  })
})

describe('the animated picture’s classes', () => {
  it.each(IMAGE_APPEARANCES)(
    '%s: frame and shape together are the still picture’s classes',
    (shape) => {
      const together = `${splitImageFrameClass(shape)} ${splitImageShapeClass(shape)}`.split(' ')
      expect(new Set(together)).toEqual(new Set(splitImageClass(shape).split(' ')))
    },
  )
})
