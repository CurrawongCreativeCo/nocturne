import { describe, expect, it } from 'vitest'

import { HERO_PRESETS, heroSubtitle } from './hero'

describe('heroSubtitle', () => {
  it('names the matching preset for each of the six', () => {
    const expected = HERO_PRESETS.map((preset) => `Hero · ${preset.title}`)
    const subtitles = HERO_PRESETS.map((preset) => {
      const set = preset.set as Record<string, string>
      return heroSubtitle({
        variant: set.variant,
        imagePosition: set.imagePosition,
        tone: set['style.tone'],
      })
    })
    expect(subtitles).toEqual(expected)
  })

  it('tells the two Split presets apart', () => {
    expect(heroSubtitle({ variant: 'split', imagePosition: 'left', tone: 'surface' })).toBe(
      'Hero · Split, image left',
    )
    expect(heroSubtitle({ variant: 'split', imagePosition: 'right', tone: 'surface' })).toBe(
      'Hero · Split, image right',
    )
  })

  it('treats unset fields as their defaults', () => {
    expect(heroSubtitle({})).toBe('Hero · Full background image')
    expect(heroSubtitle({ variant: 'split', tone: 'surface' })).toBe('Hero · Split, image right')
  })

  it('falls back to the layout and tone for a custom combination', () => {
    expect(heroSubtitle({ variant: 'split', imagePosition: 'left', tone: 'inverse' })).toBe(
      'Hero · Split · Contrast',
    )
    expect(heroSubtitle({ variant: 'editorial', tone: 'inverse' })).toBe(
      'Hero · Editorial · Contrast',
    )
  })
})
