import { describe, expect, it } from 'vitest'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_ROW_STYLES,
  LINK_LIST_VARIANTS,
  isGlassRows,
  usesDescription,
  usesFeatured,
  usesIcon,
  usesThumbnail,
} from './link-list'

describe('Glass rows', () => {
  const preset = LINK_LIST_PRESETS.find((candidate) => candidate.value === 'glass-rows')

  it('is a sixth preset of Minimal with the glass row style, not a fifth layout', () => {
    expect(LINK_LIST_PRESETS).toHaveLength(6)
    expect(preset?.set).toMatchObject({ variant: 'stacked', rowStyle: 'glass' })
    expect(LINK_LIST_VARIANTS).toHaveLength(4)
  })

  it('is the only preset with the glass row style; every other one sets it back to solid', () => {
    for (const other of LINK_LIST_PRESETS) {
      const set: Record<string, unknown> = other.set
      expect(LINK_LIST_ROW_STYLES as readonly unknown[]).toContain(set.rowStyle)
      expect(set.rowStyle === 'glass', other.value).toBe(other.value === 'glass-rows')
    }
  })

  it('only means something on Minimal', () => {
    expect(isGlassRows('stacked', 'glass')).toBe(true)
    expect(isGlassRows('stacked', 'solid')).toBe(false)
    expect(isGlassRows('stacked')).toBe(false)
    expect(isGlassRows('cards', 'glass')).toBe(false)
  })
})

describe('what a link asks for, by layout', () => {
  const layouts = LINK_LIST_VARIANTS.map((variant) => variant.value)

  it('asks for an icon everywhere but Editorial, and a thumbnail on Minimal and Cards', () => {
    expect(layouts.filter((layout) => usesIcon(layout))).toEqual(['stacked', 'cards', 'compact'])
    expect(layouts.filter((layout) => usesThumbnail(layout))).toEqual(['stacked', 'cards'])
  })

  it('asks for both in Glass rows, which draw them together', () => {
    expect(usesIcon('stacked', 'glass')).toBe(true)
    expect(usesThumbnail('stacked', 'glass')).toBe(true)
  })

  it('leaves the other layouts as they were, whatever row style is stored on them', () => {
    for (const layout of layouts.filter((candidate) => candidate !== 'stacked')) {
      expect(usesIcon(layout, 'glass'), layout).toBe(usesIcon(layout))
      expect(usesThumbnail(layout, 'glass'), layout).toBe(usesThumbnail(layout))
    }
    expect(usesIcon('stacked', 'solid')).toBe(true)
    expect(usesThumbnail('stacked', 'solid')).toBe(true)
  })

  it('keeps the description and the large link out of Compact', () => {
    expect(layouts.filter((layout) => usesDescription(layout))).toEqual([
      'stacked',
      'cards',
      'editorial',
    ])
    expect(layouts.filter((layout) => usesFeatured(layout))).toEqual([
      'stacked',
      'cards',
      'editorial',
    ])
  })
})
