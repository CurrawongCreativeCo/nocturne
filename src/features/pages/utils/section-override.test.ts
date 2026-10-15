import { describe, expect, it } from 'vitest'

import { applySectionOverride, validOverride, variantControlFor } from './section-override'
import { GALLERY_VARIANTS } from '../schemas/sections/gallery'
import { HERO_VARIANTS } from '../schemas/sections/hero'
import { STATS_VARIANTS } from '../schemas/sections/stats'
import type { PageSection } from '../types'

const section = (fields: object) => fields as PageSection

describe('variant lists', () => {
  it('match the schemas', () => {
    const values = (type: PageSection['_type']) =>
      variantControlFor(type)?.options.map((option) => option.value)
    expect(values('hero')).toEqual(HERO_VARIANTS.map((variant) => variant.value))
    expect(values('stats')).toEqual(STATS_VARIANTS.map((variant) => variant.value))
    expect(values('gallery')).toEqual(GALLERY_VARIANTS.map((variant) => variant.value))
  })
})

describe('applySectionOverride', () => {
  const hero = section({
    _key: 'a',
    _type: 'hero',
    variant: 'overlay',
    style: { tone: 'surface', spacing: 'compact' },
  })

  it('returns the very same section when nothing is chosen', () => {
    expect(applySectionOverride(hero, undefined)).toBe(hero)
    expect(applySectionOverride(hero, {})).toBe(hero)
  })

  it('switches the tone and keeps the rest of the style', () => {
    expect(applySectionOverride(hero, { tone: 'inverse' })).toMatchObject({
      variant: 'overlay',
      style: { tone: 'inverse', spacing: 'compact' },
    })
  })

  it('switches the layout without touching the original', () => {
    expect(applySectionOverride(hero, { variant: 'split' })).toMatchObject({ variant: 'split' })
    expect(hero).toMatchObject({ variant: 'overlay' })
  })

  it('stores grid columns as a number and the image side as text', () => {
    expect(
      applySectionOverride(section({ _key: 'a', _type: 'featuresGrid', columns: 3, style: {} }), {
        variant: '4',
      }),
    ).toMatchObject({ columns: 4 })
    expect(
      applySectionOverride(
        section({ _key: 'a', _type: 'mediaText', imagePosition: 'left', style: {} }),
        { variant: 'right' },
      ),
    ).toMatchObject({ imagePosition: 'right' })
  })

  it('ignores a tone or layout the section does not offer', () => {
    expect(validOverride(hero, { tone: 'neon', variant: 'masonry' })).toEqual({})
    const faq = section({ _key: 'f', _type: 'faq', style: {} })
    expect(applySectionOverride(faq, { variant: 'split' })).toBe(faq)
  })

  it('starts a style for a section that had none', () => {
    const bare = section({ _key: 'a', _type: 'faq', style: null })
    expect(applySectionOverride(bare, { tone: 'alt' })).toMatchObject({ style: { tone: 'alt' } })
  })
})
