import { describe, expect, it } from 'vitest'

import { hasImageDesign, teamPortraitControls } from './team-portrait'

describe('hasImageDesign', () => {
  it('is false for nothing, an empty object and an object of nulls (a query’s projection)', () => {
    expect(hasImageDesign(undefined)).toBe(false)
    expect(hasImageDesign(null)).toBe(false)
    expect(hasImageDesign({})).toBe(false)
    expect(hasImageDesign({ _type: 'imageDesign' })).toBe(false)
    expect(hasImageDesign({ appearance: null, motion: null, customFrameUrl: null })).toBe(false)
    expect(hasImageDesign({ appearance: '' })).toBe(false)
  })

  it('is true once any choice is saved', () => {
    expect(hasImageDesign({ _type: 'imageDesign', appearance: 'circle' })).toBe(true)
    expect(hasImageDesign({ motion: 'subtle' })).toBe(true)
  })
})

describe('teamPortraitControls', () => {
  it('offers Image design only, on Grid, Slider and an unset layout', () => {
    for (const variant of ['grid', 'slider', undefined, null]) {
      expect(teamPortraitControls({ variant })).toEqual({ imageDesign: true, portrait: false })
    }
  })

  it('offers Portrait only, on a List without an Image design (new or existing)', () => {
    expect(teamPortraitControls({ variant: 'list' })).toEqual({
      imageDesign: false,
      portrait: true,
    })
    expect(
      teamPortraitControls({ variant: 'list', imageDesign: { _type: 'imageDesign' } }),
    ).toEqual({
      imageDesign: false,
      portrait: true,
    })
  })

  it('offers Image design only, on a List that has one saved, so it can be cleared', () => {
    expect(
      teamPortraitControls({ variant: 'list', imageDesign: { appearance: 'circle' } }),
    ).toEqual({ imageDesign: true, portrait: false })
  })

  it('never offers both, whatever the section holds', () => {
    for (const variant of ['grid', 'slider', 'list', undefined]) {
      for (const imageDesign of [undefined, {}, { appearance: 'arch' }]) {
        const { imageDesign: image, portrait } = teamPortraitControls({ variant, imageDesign })
        expect(image && portrait).toBe(false)
        expect(image || portrait).toBe(true)
      }
    }
  })
})
