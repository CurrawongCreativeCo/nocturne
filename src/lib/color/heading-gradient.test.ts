import { describe, expect, it } from 'vitest'

import {
  brandColoursSlug,
  brandColoursValue,
  customGradientCss,
  validAngle,
  validColour,
  validStops,
} from './heading-gradient'

describe('validStops', () => {
  it('accepts two or three six-digit hex colours, lowercased', () => {
    expect(validStops(['#112233', '#ABCDEF'])).toEqual(['#112233', '#abcdef'])
    expect(validStops(['#000000', '#808080', '#ffffff'])).toHaveLength(3)
  })

  it('rejects the wrong count, so a half-filled gradient is not drawn', () => {
    expect(validStops(['#112233'])).toBeNull()
    expect(validStops(['#111111', '#222222', '#333333', '#444444'])).toBeNull()
    expect(validStops([])).toBeNull()
    expect(validStops(null)).toBeNull()
    expect(validStops(undefined)).toBeNull()
  })

  it('rejects anything that is not a six-digit hex colour', () => {
    for (const bad of ['#abc', 'red', 'rgb(0,0,0)', '#12345g', '112233', '#1122334', '', null]) {
      expect(validStops(['#112233', bad]), JSON.stringify(bad)).toBeNull()
    }
  })

  it('rejects colours that could carry CSS', () => {
    expect(validStops(['#112233', '#112233); background: url(x'])).toBeNull()
    expect(validStops(['#112233', 'red, blue'])).toBeNull()
  })
})

describe('validAngle', () => {
  it('keeps whole degrees, wrapped into 0-359', () => {
    expect(validAngle(0)).toBe(0)
    expect(validAngle(90)).toBe(90)
    expect(validAngle(180)).toBe(180)
    expect(validAngle(360)).toBe(0)
    expect(validAngle(450)).toBe(90)
    expect(validAngle(-90)).toBe(270)
  })

  it('uses 90 (left to right) for anything else', () => {
    for (const bad of [undefined, null, 12.5, Number.NaN, Infinity, '45', {}]) {
      expect(validAngle(bad), JSON.stringify(bad)).toBe(90)
    }
  })
})

describe('customGradientCss', () => {
  it('builds the gradient from the stops and angle', () => {
    expect(customGradientCss(['#112233', '#ABCDEF'], 45)).toBe(
      'linear-gradient(45deg, #112233, #abcdef)',
    )
    expect(customGradientCss(['#000000', '#808080', '#ffffff'], 180)).toBe(
      'linear-gradient(180deg, #000000, #808080, #ffffff)',
    )
  })

  it('defaults to left to right', () => {
    expect(customGradientCss(['#112233', '#abcdef'])).toBe(
      'linear-gradient(90deg, #112233, #abcdef)',
    )
  })

  it('draws nothing from invalid stops', () => {
    expect(customGradientCss(['#112233'], 90)).toBeNull()
    expect(customGradientCss(['#112233', 'url(x)'], 90)).toBeNull()
  })

  it('never lets the angle carry anything but digits', () => {
    expect(customGradientCss(['#112233', '#abcdef'], '1deg, red); x(')).toBe(
      'linear-gradient(90deg, #112233, #abcdef)',
    )
  })
})

describe('brand colours values', () => {
  it('round-trips a slug', () => {
    expect(brandColoursValue('forest-dusk')).toBe('brand-colours:forest-dusk')
    expect(brandColoursSlug('brand-colours:forest-dusk')).toBe('forest-dusk')
  })

  it('ignores presets, custom and malformed slugs', () => {
    for (const value of ['brand', 'custom', 'brand-green', null, undefined, '']) {
      expect(brandColoursSlug(value), String(value)).toBeNull()
    }
    for (const slug of ['', 'Bad', 'a b', 'a;b', 'a)', '-x', 'x-']) {
      expect(brandColoursSlug(`brand-colours:${slug}`), slug).toBeNull()
    }
  })
})

describe('validColour', () => {
  it('accepts one six-digit hex colour, lowercased', () => {
    expect(validColour('#3266E4')).toBe('#3266e4')
  })

  it('rejects everything else', () => {
    for (const bad of ['#abc', 'red', 'url(x)', '#3266e4;', '', null, undefined, 12]) {
      expect(validColour(bad), JSON.stringify(bad)).toBeNull()
    }
  })
})
