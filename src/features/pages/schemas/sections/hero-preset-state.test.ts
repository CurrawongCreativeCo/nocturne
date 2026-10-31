import { describe, expect, it } from 'vitest'

import { describePresetState, presetStateText } from '@/lib/sanity/schema/preset-match'

import { HERO_DEFAULTS, HERO_PRESETS } from './hero'

/**
 * A trial of the Link list's summary on the hero's preset state (README, "Link list": Reading a
 * link's design). Nothing in the Studio uses it yet; it shows what the hero would say.
 */
const LABELS = { variant: 'layout', imagePosition: 'image side', 'style.tone': 'tone' }
const text = (value: unknown) =>
  presetStateText(describePresetState(HERO_PRESETS, value, HERO_DEFAULTS), LABELS)

describe('hero preset state', () => {
  it('names a hero that was never touched', () => {
    expect(text({})).toBe('Full background image')
  })

  it('names the preset a hero was started from once one thing moves', () => {
    expect(text({ variant: 'split', imagePosition: 'left', style: { tone: 'inverse' } })).toBe(
      'Custom · based on Split, image left · 1 change (tone)',
    )
  })

  it('breaks a one-field tie towards the preset whose layout still matches', () => {
    // Editorial with a dark tone is one field from Editorial (tone) and one from Full background
    // image (layout). The layout is the defining field, so Editorial is the starting point.
    expect(text({ variant: 'editorial', style: { tone: 'inverse' } })).toBe(
      'Custom · based on Editorial · 1 change (tone)',
    )
  })
})
