import { describe, expect, it } from 'vitest'

import {
  EDGE_HEIGHT_RANGE,
  closeToTop,
  customEdgeHeight,
  edgeBackLine,
  edgeFill,
  edgeHeightStyle,
  edgeLine,
  edgeMaskImage,
  type EdgeShape,
} from './section-edges'

const SHAPES: EdgeShape[] = ['diagonal', 'wave', 'curve', 'arch', 'layered']

/** Every coordinate in a path (letters dropped), as numbers. */
const numbers = (path: string) => (path.match(/-?\d*\.?\d+/g) ?? []).map(Number)

describe('the edge paths', () => {
  it.each(SHAPES)('%s stays inside the 0-1 box, with every flip and invert', (shape) => {
    for (const flip of [false, true]) {
      for (const invert of [false, true]) {
        const values = numbers(edgeLine(shape, { flip, invert }))
        expect(values.length).toBeGreaterThan(3)
        for (const value of values) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it.each(SHAPES)('%s runs the full width of the band', (shape) => {
    const values = numbers(edgeLine(shape))
    // Coordinates alternate x, y: the first x and the last x touch the two sides.
    expect(values[0]).toBe(0)
    expect(values[values.length - 2]).toBe(1)
  })

  it('draws the back wave as a different line from the front one', () => {
    expect(edgeBackLine()).not.toBe(edgeLine('layered'))
    expect(numbers(edgeBackLine()).every((n) => n >= 0 && n <= 1)).toBe(true)
  })

  it('mirrors left to right with Flip, and top to bottom with Invert', () => {
    const line = edgeLine('diagonal')
    expect(line).toBe('M0 0L1 1')
    expect(edgeLine('diagonal', { flip: true })).toBe('M1 0L0 1')
    expect(edgeLine('diagonal', { invert: true })).toBe('M0 1L1 0')
    expect(edgeLine('curve', { invert: true }).startsWith('M0 1C')).toBe(true)
  })

  it('makes a wave that Flip and Invert each change, so the options are never idle', () => {
    const plain = edgeLine('wave')
    const flipped = edgeLine('wave', { flip: true })
    const inverted = edgeLine('wave', { invert: true })
    expect(
      new Set([plain, flipped, inverted, edgeLine('wave', { flip: true, invert: true })]).size,
    ).toBe(4)
  })

  it('closes a line along the top of the band, whichever way it runs', () => {
    expect(closeToTop('M0 0.5L1 0.5')).toBe('M0 0.5L1 0.5L1 0L0 0Z')
    expect(closeToTop('M1 0.5L0 0.5')).toBe('M1 0.5L0 0.5L0 0L1 0Z')
    expect(edgeFill('diagonal')).toBe('M0 0L1 1L1 0L0 0Z')
  })

  it('wraps the filled shape in a data-URI SVG a mask can use', () => {
    const image = edgeMaskImage('wave')
    expect(image.startsWith('url("data:image/svg+xml,')).toBe(true)
    const svg = decodeURIComponent(image.slice('url("data:image/svg+xml,'.length, -2))
    expect(svg).toContain('viewBox="0 0 1 1"')
    expect(svg).toContain('preserveAspectRatio="none"')
    expect(svg).toContain(`d="${edgeFill('wave')}"`)
    // Nothing in it can close the CSS string.
    expect(image.slice('url("'.length, -2)).not.toContain('"')
  })
})

describe('edge heights', () => {
  it('keeps the token height as one variable, the same for the edge and the section below it', () => {
    const height = { kind: 'token', size: 'large' } as const
    expect(edgeHeightStyle(height, '--edge-h')).toEqual({ '--edge-h': 'var(--edge-height-large)' })
    expect(edgeHeightStyle(height, '--edge-above')).toEqual({
      '--edge-above': 'var(--edge-height-large)',
    })
  })

  it('has no custom height until one is set', () => {
    expect(customEdgeHeight({})).toBeUndefined()
    expect(customEdgeHeight({ mobile: null, tablet: undefined })).toBeUndefined()
  })

  it('lets a blank screen size keep the smaller one’s height', () => {
    expect(customEdgeHeight({ mobile: 40, desktop: 120 })).toEqual({
      kind: 'custom',
      mobile: '40px',
      tablet: '40px',
      desktop: '120px',
    })
    expect(customEdgeHeight({ tablet: 80 })).toEqual({
      kind: 'custom',
      mobile: 'var(--edge-height-medium)',
      tablet: '80px',
      desktop: '80px',
    })
  })

  it('clamps and rounds what an editor typed, and ignores what is not a number', () => {
    const height = customEdgeHeight({ mobile: 2, tablet: 1000, desktop: 77.6 })
    expect(height).toMatchObject({
      mobile: `${EDGE_HEIGHT_RANGE.min}px`,
      tablet: `${EDGE_HEIGHT_RANGE.max}px`,
      desktop: '78px',
    })
    expect(customEdgeHeight({ mobile: Number.NaN })).toBeUndefined()
  })

  it('hands the three custom heights to globals.css, for the edge and the section below alike', () => {
    const height = customEdgeHeight({ mobile: 32, tablet: 64, desktop: 96 })
    if (!height) throw new Error('expected a custom height')
    const expected = {
      '--edge-custom-base': '32px',
      '--edge-custom-md': '64px',
      '--edge-custom-lg': '96px',
    }
    expect(edgeHeightStyle(height, '--edge-h')).toEqual(expected)
    expect(edgeHeightStyle(height, '--edge-above')).toEqual(expected)
  })
})
