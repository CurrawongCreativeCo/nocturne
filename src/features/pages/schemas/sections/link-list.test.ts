import { describe, expect, it } from 'vitest'

import {
  LINK_LIST_PRESETS,
  LINK_LIST_ROW_STYLES,
  LINK_LIST_VARIANTS,
  isGlassRows,
  linkList,
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

describe('Design boxes and conditional fields', () => {
  type Hidden = (context: Record<string, unknown>) => boolean
  interface Field {
    name: string
    hidden?: Hidden | boolean
    fields?: Field[]
  }
  const fields = linkList.fields as unknown as Field[]
  const field = (name: string, list: Field[] = fields) => {
    const found = list.find((candidate) => candidate.name === name)
    if (!found) throw new Error(`No field ${name}`)
    return found
  }
  const AGENCY = { currentUser: { roles: [{ name: 'administrator' }] } }
  const hidden = (target: Field, context: Record<string, unknown>) =>
    typeof target.hidden === 'function' ? target.hidden({ ...AGENCY, ...context }) : target.hidden

  it('offers Links on every layout but Compact, which draws no arrow', () => {
    expect(hidden(field('linkDesign'), { parent: { variant: 'compact' } })).toBe(true)
    expect(hidden(field('linkDesign'), { parent: { variant: 'cards' } })).toBe(false)
  })

  it('hides Social icons when the section shows none', () => {
    expect(hidden(field('socialDesign'), { parent: { socialSource: 'none' } })).toBe(true)
    expect(hidden(field('socialDesign'), { parent: { socialSource: 'business' } })).toBe(false)
  })

  it('shows the border options only for the border that uses them', () => {
    const profile = field('profileDesign').fields ?? []
    const shown = (name: string, border?: string) =>
      !hidden(field(name, profile), { parent: { border } })
    expect(shown('borderWidth')).toBe(false)
    expect(shown('borderWidth', 'line')).toBe(true)
    expect(shown('borderGradient', 'line')).toBe(false)
    expect(shown('borderGradient', 'gradient')).toBe(true)
    expect(shown('frame', 'gradient')).toBe(false)
    expect(shown('frame', 'frame')).toBe(true)
    expect(shown('borderColour', 'gradient')).toBe(false)
  })

  it('shows the heading image only once Image is chosen', () => {
    expect(hidden(field('headingImage'), { parent: { headingDisplay: 'text' } })).toBe(true)
    expect(hidden(field('headingImage'), { parent: {} })).toBe(true)
    expect(hidden(field('headingImage'), { parent: { headingDisplay: 'image' } })).toBe(false)
  })

  it('keeps the older arrow switch for saved content, out of sight', () => {
    expect(field('showArrows').hidden).toBe(true)
  })
})
