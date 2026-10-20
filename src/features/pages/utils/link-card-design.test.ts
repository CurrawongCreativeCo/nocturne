import { describe, expect, it } from 'vitest'

import {
  cardOverrides,
  layerLinkCardDesign,
  listCardDesignInput,
  resolveLinkCardDesign,
} from './link-card-design'

const list = resolveLinkCardDesign(
  listCardDesignInput({
    cardDesign: {
      background: { colour: 'custom', hex: '#0b4a4c' },
      backgroundStrength: 'medium',
      border: 'thin',
      borderColour: { colour: 'custom', hex: '#b8962e' },
      label: { size: 'medium', colour: { colour: 'accent' } },
    },
    linkDesign: { iconShape: 'circle', iconColour: { colour: 'highlight' }, arrowStyle: 'chevron' },
    depthDesign: { linkShadow: 'raised' },
  }),
)

describe('Link card design layering', () => {
  it('reads the list’s Cards, Arrows and icons and Link shadow as one layer', () => {
    expect(list.surface).toEqual({
      background: '#0b4a4c',
      strength: 'medium',
      border: 'thin',
      borderColour: '#b8962e',
    })
    expect(list.icon).toEqual({ shape: 'circle', colour: 'var(--color-highlight)' })
    expect(list.shadow).toBe('raised')
    expect(list.arrow).toBe('chevron')
  })

  it('changes only what a featured card overrides', () => {
    const card = resolveLinkCardDesign({
      appearance: 'custom',
      backgroundStrength: 'strong',
      border: 'thick',
      label: { size: 'large', colour: { colour: 'highlight' } },
      iconBackground: { colour: 'highlight' },
    } as never)
    const design = layerLinkCardDesign(list, card)
    expect(design.surface).toEqual({
      background: '#0b4a4c',
      strength: 'strong',
      border: 'thick',
      borderColour: '#b8962e',
    })
    expect(design.label).toEqual({ size: 'large', colour: 'var(--color-highlight)' })
    expect(design.icon).toEqual({
      shape: 'circle',
      colour: 'var(--color-highlight)',
      background: 'var(--color-highlight)',
    })
    expect(design.shadow).toBe('raised')
  })

  it('keeps the deliberate off values of a card: no border, no shadow, no arrow, transparent', () => {
    const card = resolveLinkCardDesign({
      border: 'none',
      shadow: 'flat',
      arrowStyle: 'none',
      background: { colour: 'transparent' },
    })
    const design = layerLinkCardDesign(list, card)
    expect(design.surface.border).toBe('none')
    expect(design.surface.background).toBe('transparent')
    expect(design.shadow).toBe('flat')
    expect(design.arrow).toBe('none')
  })

  it('applies a card’s overrides only while it is customised', () => {
    type Stored = { appearance?: string; border?: string } | null
    const overrides = (design: Stored) => cardOverrides(design)
    expect(overrides({ appearance: 'custom', border: 'none' })).toEqual({
      appearance: 'custom',
      border: 'none',
    })
    // Switching back to the list's design restores inheritance; the stored choices are ignored.
    expect(overrides({ border: 'none' })).toBeUndefined()
    expect(overrides({ appearance: 'inherit', border: 'none' })).toBeUndefined()
    expect(overrides(null)).toBeUndefined()
  })

  it('is empty for a list with nothing chosen, so every layout draws its own look', () => {
    const empty = resolveLinkCardDesign(listCardDesignInput({}))
    expect(empty).toEqual({ surface: {}, eyebrow: {}, label: {}, description: {}, icon: {} })
  })
})
