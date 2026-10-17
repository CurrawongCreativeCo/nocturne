import { describe, expect, it } from 'vitest'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_THUMBNAIL_SIZES,
  LINK_LIST_VARIANTS,
} from '@/features/pages/schemas/sections/link-list'
import { matchPreset } from '@/lib/sanity/schema/preset-match'
import { SECTION_ALIGNS } from '@/lib/sanity/section-style-options'

/**
 * Lives in the route folder because it reads two features: the Link list's presets (page builder)
 * and the Studio's matching of them.
 */

describe('link list presets', () => {
  it('has the five pictures, Minimal first (a new Link list starts as that)', () => {
    expect(LINK_LIST_PRESETS.map((preset) => preset.value)).toEqual([
      'minimal',
      'cards',
      'editorial',
      'compact',
      'image-focused',
    ])
    expect(LINK_LIST_PRESETS[0].set.variant).toBe(LINK_LIST_VARIANTS[0].value)
  })

  it('keeps to four layouts: Image-focused is Cards with large pictures, not a fifth variant', () => {
    expect(LINK_LIST_VARIANTS.map((variant) => variant.value)).toEqual([
      'stacked',
      'cards',
      'editorial',
      'compact',
    ])
    const imageFocused = LINK_LIST_PRESETS.find((preset) => preset.value === 'image-focused')
    expect(imageFocused?.set).toMatchObject({ variant: 'cards', thumbnailSize: 'large' })
  })

  it('sets only layouts, picture sizes and alignments that exist', () => {
    const variants = LINK_LIST_VARIANTS.map((variant) => variant.value) as string[]
    for (const preset of LINK_LIST_PRESETS) {
      const set: Record<string, unknown> = preset.set
      expect(variants, preset.value).toContain(set.variant)
      expect(LINK_LIST_THUMBNAIL_SIZES as readonly unknown[], preset.value).toContain(
        set.thumbnailSize,
      )
      expect(SECTION_ALIGNS as readonly unknown[], preset.value).toContain(set['style.align'])
    }
  })

  it('tells all five apart, and the first matches a section that has just been added', () => {
    const fresh = { variant: 'stacked', thumbnailSize: 'standard', style: { align: 'center' } }
    expect(matchPreset(LINK_LIST_PRESETS, fresh)?.value).toBe('minimal')
    for (const preset of LINK_LIST_PRESETS) {
      const value = {
        variant: preset.set.variant,
        thumbnailSize: preset.set.thumbnailSize,
        style: { align: preset.set['style.align'] },
      }
      expect(matchPreset(LINK_LIST_PRESETS, value)?.value, preset.value).toBe(preset.value)
    }
  })

  it('becomes Custom once a preset’s value is changed', () => {
    const changed = { variant: 'cards', thumbnailSize: 'large', style: { align: 'start' } }
    expect(matchPreset(LINK_LIST_PRESETS, changed)).toBeNull()
  })
})
