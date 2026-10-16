import { describe, expect, it } from 'vitest'

import { PART_PRESETS } from '@/lib/sanity/section-style-options'

import {
  HERO_PARTS,
  HERO_PART_SPECS,
  HERO_PART_TITLES,
  heroPartOverrides,
  heroPartsPresent,
  resolveHeroParts,
  type HeroPartsInput,
} from './hero-parts'

const picture = { asset: { _ref: 'image-abc' } }
const full: HeroPartsInput = {
  eyebrow: 'Eyebrow',
  description: 'Description',
  ctas: [{}],
  backgroundImage: picture,
  secondaryImage: picture,
  supporting: [{}],
}

describe('heroPartsPresent', () => {
  it('declares every part once, with a title and a spec', () => {
    expect(new Set(HERO_PARTS).size).toBe(HERO_PARTS.length)
    expect(Object.keys(HERO_PART_TITLES)).toEqual([...HERO_PARTS])
    expect(Object.keys(HERO_PART_SPECS)).toEqual([...HERO_PARTS])
  })

  it('always has a heading, and nothing else for an empty hero', () => {
    expect(heroPartsPresent({})).toEqual(['heading'])
  })

  it('has the full background and no picture beside the text in Full background and Image with panel', () => {
    for (const variant of ['overlay', 'full-bleed', undefined, 'from-a-later-release']) {
      expect(heroPartsPresent({ ...full, variant })).toEqual(
        [...HERO_PARTS].filter((p) => p !== 'image'),
      )
    }
  })

  it('has the picture beside the text in Split, from the main image', () => {
    const parts = heroPartsPresent({ ...full, variant: 'split' })
    expect(parts).toContain('image')
    expect(parts).not.toContain('background')
  })

  it('has the small picture in Editorial, and not the main one', () => {
    expect(heroPartsPresent({ ...full, variant: 'editorial' })).toContain('image')
    expect(
      heroPartsPresent({ ...full, variant: 'editorial', secondaryImage: undefined }),
    ).not.toContain('image')
    expect(
      heroPartsPresent({ ...full, variant: 'editorial', backgroundImage: undefined }),
    ).toContain('image')
  })

  it('leaves out what has no content', () => {
    const parts = heroPartsPresent({
      variant: 'split',
      eyebrow: '',
      description: null,
      ctas: [],
      backgroundImage: {},
      supporting: [],
    })
    expect(parts).toEqual(['heading'])
  })
})

describe('heroPartOverrides', () => {
  it('reads a preset and a delay for every part, whatever is stored', () => {
    const overrides = heroPartOverrides({
      enabled: true,
      headingPreset: 'reveal',
      headingDelay: 'long',
    })
    expect(overrides.heading).toEqual({ preset: 'reveal', delay: 'long' })
    expect(overrides.eyebrow).toEqual({ preset: undefined, delay: undefined })
    expect(Object.keys(heroPartOverrides(null))).toEqual([...HERO_PARTS])
  })

  it('has no part the options do not know', () => {
    expect(PART_PRESETS).toContain('inherit')
  })
})

describe('resolveHeroParts', () => {
  const hero: Parameters<typeof resolveHeroParts>[0] = { ...full, variant: 'overlay' }
  const defaults = { motion: 'none' } as const

  it('by default rises the intro, buttons and extra content, and leaves the rest still', () => {
    const plans = resolveHeroParts(hero, defaults, true)
    expect(plans.description).toMatchObject({ kind: 'enter', preset: 'rise' })
    expect(plans.buttons).toMatchObject({ kind: 'enter', preset: 'rise' })
    expect(plans.slot).toMatchObject({ kind: 'enter', preset: 'rise' })
    expect(plans.eyebrow).toEqual({ kind: 'none' })
    expect(plans.heading).toEqual({ kind: 'none' })
    expect(plans.background).toEqual({ kind: 'none' })
    expect(plans).not.toHaveProperty('image')
  })

  it('follows a Parallax section on its background', () => {
    const plans = resolveHeroParts({ ...hero, style: { motion: 'parallax' } }, defaults, false)
    expect(plans.background).toMatchObject({ kind: 'parallax', speed: 0.25 })
  })

  it('does not move a Split picture with a Parallax left over from another layout', () => {
    const plans = resolveHeroParts(
      { ...hero, variant: 'split', style: { motion: 'parallax' } },
      defaults,
      false,
    )
    expect(plans.image).toEqual({ kind: 'none' })
  })

  it('applies the part choices only once the switch is on', () => {
    const partMotion = { headingPreset: 'slide', backgroundPreset: 'parallax' }
    const off = resolveHeroParts(
      { ...hero, partMotion: { ...partMotion, enabled: false } },
      defaults,
      true,
    )
    expect(off.heading).toEqual({ kind: 'none' })
    const on = resolveHeroParts(
      { ...hero, partMotion: { ...partMotion, enabled: true } },
      defaults,
      true,
    )
    expect(on.heading).toMatchObject({ kind: 'enter', preset: 'slide' })
    expect(on.background).toMatchObject({ kind: 'parallax', from: 'top' })
  })

  it('lets a heading further down the page wipe in, and keeps the first one whole', () => {
    const partMotion = { enabled: true, headingPreset: 'reveal' }
    expect(resolveHeroParts({ ...hero, partMotion }, defaults, false).heading).toMatchObject({
      kind: 'enter',
      preset: 'reveal',
    })
    expect(resolveHeroParts({ ...hero, partMotion }, defaults, true).heading).toEqual({
      kind: 'none',
    })
  })

  it('moves a Split picture with Parallax when asked', () => {
    const plans = resolveHeroParts(
      { ...hero, variant: 'split', partMotion: { enabled: true, imagePreset: 'parallax' } },
      defaults,
      false,
    )
    expect(plans.image).toMatchObject({ kind: 'parallax', speed: 0.15 })
  })

  it('ignores a choice for a part the hero does not have', () => {
    const plans = resolveHeroParts(
      {
        variant: 'overlay',
        partMotion: { enabled: true, eyebrowPreset: 'rise', imagePreset: 'scale' },
      },
      defaults,
      false,
    )
    expect(Object.keys(plans)).toEqual(['heading'])
  })
})
