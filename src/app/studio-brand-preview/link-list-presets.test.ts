import { describe, expect, it } from 'vitest'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_ROW_STYLES,
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
  it('has the six pictures, Minimal first (a new Link list starts as that)', () => {
    expect(LINK_LIST_PRESETS.map((preset) => preset.value)).toEqual([
      'minimal',
      'cards',
      'editorial',
      'compact',
      'image-focused',
      'glass-rows',
    ])
    expect(LINK_LIST_PRESETS[0].set.variant).toBe(LINK_LIST_VARIANTS[0].value)
  })

  it('keeps to four layouts: Image-focused is Cards with large pictures and Glass rows is Minimal with glass rows, not more variants', () => {
    expect(LINK_LIST_VARIANTS.map((variant) => variant.value)).toEqual([
      'stacked',
      'cards',
      'editorial',
      'compact',
    ])
    const imageFocused = LINK_LIST_PRESETS.find((preset) => preset.value === 'image-focused')
    expect(imageFocused?.set).toMatchObject({ variant: 'cards', thumbnailSize: 'large' })
    const glassRows = LINK_LIST_PRESETS.find((preset) => preset.value === 'glass-rows')
    expect(glassRows?.set).toMatchObject({ variant: 'stacked', rowStyle: 'glass' })
  })

  it('sets only layouts, row styles, picture sizes and alignments that exist', () => {
    const variants = LINK_LIST_VARIANTS.map((variant) => variant.value) as string[]
    for (const preset of LINK_LIST_PRESETS) {
      const set: Record<string, unknown> = preset.set
      expect(variants, preset.value).toContain(set.variant)
      expect(LINK_LIST_ROW_STYLES as readonly unknown[], preset.value).toContain(set.rowStyle)
      expect(LINK_LIST_THUMBNAIL_SIZES as readonly unknown[], preset.value).toContain(
        set.thumbnailSize,
      )
      expect(SECTION_ALIGNS as readonly unknown[], preset.value).toContain(set['style.align'])
    }
  })

  it('tells all six apart, and the first matches a section that has just been added', () => {
    const fresh = { variant: 'stacked', thumbnailSize: 'standard', style: { align: 'center' } }
    // A section saved before Glass rows has no row style: the bar reads it as the field's initial value.
    expect(matchPreset(LINK_LIST_PRESETS, fresh, { rowStyle: 'solid' })?.value).toBe('minimal')
    for (const preset of LINK_LIST_PRESETS) {
      const value = {
        variant: preset.set.variant,
        rowStyle: preset.set.rowStyle,
        thumbnailSize: preset.set.thumbnailSize,
        style: { align: preset.set['style.align'] },
      }
      expect(matchPreset(LINK_LIST_PRESETS, value)?.value, preset.value).toBe(preset.value)
    }
  })

  it('becomes Custom once a preset’s value is changed', () => {
    const changed = {
      variant: 'cards',
      rowStyle: 'solid',
      thumbnailSize: 'large',
      style: { align: 'start' },
    }
    expect(matchPreset(LINK_LIST_PRESETS, changed)).toBeNull()
  })
})
