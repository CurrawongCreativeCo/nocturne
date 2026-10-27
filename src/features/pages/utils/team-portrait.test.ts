import { describe, expect, it } from 'vitest'

import { hasImageDesign, listUsesProfilePortrait } from './team-portrait'

describe('team list portraits', () => {
  it('keep the list’s original portrait while nothing is chosen', () => {
    expect(listUsesProfilePortrait({})).toBe(false)
    expect(listUsesProfilePortrait({ imageDesign: null, portraitDesign: null })).toBe(false)
    expect(
      listUsesProfilePortrait({
        imageDesign: { appearance: null, motion: null },
        portraitDesign: { imageSize: null, imageShape: null, border: null },
      }),
    ).toBe(false)
  })

  it('use the profile picture design once it names something', () => {
    expect(listUsesProfilePortrait({ portraitDesign: { imageSize: 'large' } })).toBe(true)
    expect(listUsesProfilePortrait({ portraitDesign: { border: 'line' } })).toBe(true)
  })

  it('keep an existing Image design, so one picture never has two designs', () => {
    const imageDesign = { _type: 'imageDesign', appearance: 'circle', motion: null }
    expect(hasImageDesign({ imageDesign })).toBe(true)
    expect(listUsesProfilePortrait({ imageDesign, portraitDesign: { imageSize: 'small' } })).toBe(
      false,
    )
  })
})
