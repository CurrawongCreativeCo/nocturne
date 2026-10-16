import { describe, expect, it } from 'vitest'

import {
  SPLIT_IMAGE_SHAPES,
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

  it('keeps the circle square and every shape cropped to fit', () => {
    expect(splitImageClass('circle')).toContain('aspect-square')
    expect(splitImageClass('circle')).toContain('rounded-full')
    for (const shape of SPLIT_IMAGE_SHAPES) {
      expect(splitImageClass(shape)).toContain('object-cover')
    }
  })
})

describe('the animated picture’s classes', () => {
  it.each(SPLIT_IMAGE_SHAPES)(
    '%s: frame and shape together are the still picture’s classes',
    (shape) => {
      const together = `${splitImageFrameClass(shape)} ${splitImageShapeClass(shape)}`.split(' ')
      expect(new Set(together)).toEqual(new Set(splitImageClass(shape).split(' ')))
    },
  )
})
