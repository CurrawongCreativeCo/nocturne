import { describe, expect, it } from 'vitest'

import { describeImageProblem, orientationOf, parseAspect, recommendation } from './image-guidance'

describe('parseAspect', () => {
  it('reads width:height', () => {
    expect(parseAspect('3:2')).toBe(1.5)
    expect(parseAspect('1:1')).toBe(1)
  })
  it('ignores anything else', () => {
    expect(parseAspect('wide')).toBeUndefined()
    expect(parseAspect('3:0')).toBeUndefined()
    expect(parseAspect(undefined)).toBeUndefined()
  })
})

describe('orientationOf', () => {
  it('calls near-equal sides square', () => {
    expect(orientationOf({ width: 1000, height: 1030 })).toBe('square')
    expect(orientationOf({ width: 1200, height: 800 })).toBe('landscape')
    expect(orientationOf({ width: 1200, height: 1800 })).toBe('portrait')
  })
})

describe('recommendation', () => {
  it('gives size and shape from aspect and minWidth', () => {
    expect(recommendation({ aspect: '3:2', minWidth: 2400 })).toBe(
      'Recommended: 2400 × 1600 px, landscape.',
    )
    expect(recommendation({ aspect: '1:1', minWidth: 800 })).toBe(
      'Recommended: 800 × 800 px, square.',
    )
  })
  it('handles width only and orientation only', () => {
    expect(recommendation({ minWidth: 2400, orientation: 'landscape' })).toBe(
      'Recommended: at least 2400 px wide, landscape.',
    )
    expect(recommendation({ minWidth: 400 })).toBe('Recommended: at least 400 px wide.')
  })
  it('is empty with nothing to recommend', () => {
    expect(recommendation({})).toBe('')
  })
})

describe('describeImageProblem', () => {
  const hero = { aspect: '3:2', minWidth: 2400 } as const

  it('explains a portrait picture in a landscape spot', () => {
    expect(describeImageProblem({ width: 1200, height: 1800 }, hero)).toBe(
      'This image is 1200 × 1800 (portrait). This spot looks best with a landscape image at least 2400 px wide.',
    )
  })
  it('warns about width alone', () => {
    expect(describeImageProblem({ width: 1800, height: 1200 }, hero)).toContain('(landscape)')
  })
  it('accepts a good picture', () => {
    expect(describeImageProblem({ width: 2400, height: 1600 }, hero)).toBeUndefined()
  })
  it('allows a shape within 15% of the aspect', () => {
    // 3:2 is 1.5; 1.3 is 13.3% off.
    expect(describeImageProblem({ width: 2600, height: 2000 }, hero)).toBeUndefined()
    // 1.2 is 20% off.
    expect(describeImageProblem({ width: 2400, height: 2000 }, hero)).toBeDefined()
  })
  it('checks only the orientation when no aspect is given', () => {
    const bg = { minWidth: 2400, orientation: 'landscape' } as const
    expect(describeImageProblem({ width: 3000, height: 1000 }, bg)).toBeUndefined()
    expect(describeImageProblem({ width: 2400, height: 3000 }, bg)).toContain('landscape image')
  })
  it('asks for "an image" when shape does not matter', () => {
    expect(describeImageProblem({ width: 200, height: 100 }, { minWidth: 400 })).toBe(
      'This image is 200 × 100 (landscape). This spot looks best with an image at least 400 px wide.',
    )
  })
})
