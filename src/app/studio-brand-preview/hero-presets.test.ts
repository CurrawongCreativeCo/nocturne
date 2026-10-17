import { describe, expect, it } from 'vitest'

import { HERO_PRESETS, HERO_VARIANTS, hero } from '@/features/pages/schemas/sections/hero'
import { matchPreset } from '@/lib/sanity/schema/preset-match'
import { SECTION_TONES } from '@/lib/sanity/section-style-options'

/**
 * Lives in the route folder because it reads two features: the hero's presets (page builder) and the
 * Studio's matching of them.
 */

const IMAGE_SIDES = ['left', 'right']

describe('hero presets', () => {
  it('has the six pictures, the Full background one first (a new hero starts as that)', () => {
    expect(HERO_PRESETS.map((preset) => preset.value)).toEqual([
      'full-background',
      'split-right',
      'split-left',
      'centred-text',
      'editorial',
      'image-with-panel',
    ])
    const [first] = HERO_PRESETS
    expect(first.set.variant).toBe(HERO_VARIANTS[0].value)
    expect(first.set['style.tone']).toBe('inverse')
  })

  it('sets only layouts, image sides and tones that exist, each setting the layout and the tone', () => {
    const variants = HERO_VARIANTS.map((variant) => variant.value) as string[]
    for (const preset of HERO_PRESETS) {
      const set: Record<string, unknown> = preset.set
      expect(variants, preset.value).toContain(set.variant)
      expect(SECTION_TONES as readonly unknown[], preset.value).toContain(set['style.tone'])
      if ('imagePosition' in set) expect(IMAGE_SIDES).toContain(set.imagePosition)
    }
  })

  it('keeps stored layout values, so no content needs a migration', () => {
    expect(HERO_VARIANTS.map((variant) => variant.value)).toEqual([
      'overlay',
      'split',
      'editorial',
      'full-bleed',
    ])
    expect(HERO_VARIANTS.map((variant) => variant.title)).toEqual([
      'Full background',
      'Split',
      'Editorial',
      'Image with panel',
    ])
  })

  it('is told apart by the bar: each preset matches itself, and nothing earlier', () => {
    const { presets } = hero.options
    for (const preset of presets) {
      expect(matchPreset(presets, nested(preset.set))?.value).toBe(preset.value)
    }
  })

  it('shows Custom once a field no longer matches', () => {
    const { presets } = hero.options
    const accent = { variant: 'split', imagePosition: 'right', style: { tone: 'accent' } }
    expect(matchPreset(presets, accent)).toBeNull()
  })
})

/** { 'style.tone': 'x' } as the nested value a section holds. */
function nested(set: Record<string, unknown>) {
  const value: Record<string, unknown> = {}
  for (const [key, next] of Object.entries(set)) {
    const [head, tail] = key.split('.')
    if (tail && head) {
      value[head] = { ...(value[head] as Record<string, unknown> | undefined), [tail]: next }
    } else {
      value[key] = next
    }
  }
  return value
}
