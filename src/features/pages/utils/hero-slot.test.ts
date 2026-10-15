import { describe, expect, it } from 'vitest'

import { HERO_VARIANTS } from '@/features/pages/schemas/sections/hero'

import { HERO_SLOT_PLACEMENT, HERO_SLOT_SPACING, heroSlotPlacement } from './hero-slot'

describe('heroSlotPlacement', () => {
  it('places the slot for every layout in the schema, and none that does not exist', () => {
    expect(Object.keys(HERO_SLOT_PLACEMENT).sort()).toEqual(
      HERO_VARIANTS.map((variant) => variant.value).sort(),
    )
  })

  it.each([
    ['overlay', 'below-buttons'],
    ['split', 'below-buttons'],
    ['editorial', 'beside-text'],
    ['full-bleed', 'in-panel'],
  ])('puts the slot in %s %s', (variant, placement) => {
    expect(heroSlotPlacement(variant)).toBe(placement)
  })

  it('gives unset and unknown layouts the default layout’s placement', () => {
    expect(heroSlotPlacement(undefined)).toBe('below-buttons')
    expect(heroSlotPlacement(null)).toBe('below-buttons')
    expect(heroSlotPlacement('from-a-later-release')).toBe('below-buttons')
  })

  it('has spacing for every placement', () => {
    for (const placement of Object.values(HERO_SLOT_PLACEMENT)) {
      expect(HERO_SLOT_SPACING).toHaveProperty(placement)
    }
  })
})
