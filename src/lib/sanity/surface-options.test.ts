import { describe, expect, it } from 'vitest'

import {
  glassSurfaceLook,
  iconLook,
  resolveIconDesign,
  resolveSurface,
  ringSurfaceLook,
  SURFACE_STRENGTHS,
  SURFACE_STRENGTH_FRACTION,
} from './surface-options'

const OWN = { background: 'bg-surface hover:bg-surface-alt', border: 'ring-1 ring-inset ring-line' }

describe('resolveSurface', () => {
  it('keeps only what was chosen, so an empty box changes nothing', () => {
    expect(resolveSurface(undefined)).toEqual({})
    expect(resolveSurface({ background: { colour: 'inherit' }, border: 'wobbly' })).toEqual({})
  })

  it('keeps the deliberate off values', () => {
    expect(resolveSurface({ background: { colour: 'transparent' }, border: 'none' })).toEqual({
      background: 'transparent',
      border: 'none',
    })
  })

  it('fills with the brand colour itself, not its text shade', () => {
    expect(resolveSurface({ background: { colour: 'accent' } }).background).toBe(
      'var(--color-accent)',
    )
  })

  it('ignores a Custom colour without a valid hex (it inherits)', () => {
    expect(resolveSurface({ borderColour: { colour: 'custom', hex: 'gold' } })).toEqual({})
    expect(resolveSurface({ borderColour: { colour: 'custom', hex: '#B8962E' } })).toEqual({
      borderColour: '#b8962e',
    })
  })
})

describe('the Wash strength', () => {
  it('is a faint 12% tint, below every glass strength, and still a choice a card can store', () => {
    expect(resolveSurface({ backgroundStrength: 'wash' })).toEqual({ strength: 'wash' })
    expect(SURFACE_STRENGTH_FRACTION.wash).toBe(0.12)
    expect(SURFACE_STRENGTH_FRACTION.wash).toBeLessThan(SURFACE_STRENGTH_FRACTION.light)
    expect(SURFACE_STRENGTHS[0]).toBe('wash')
  })

  it('draws a ring surface and glass at 12% of the colour', () => {
    const design = resolveSurface({ background: { colour: 'accent' }, backgroundStrength: 'wash' })
    expect(
      (ringSurfaceLook(design, OWN).style as Record<string, string>)['--surface-bg'],
    ).toContain('12%')
    expect(
      (glassSurfaceLook(design, { strength: 'medium' }).style as Record<string, string>)[
        '--glass-tint'
      ],
    ).toContain('12%')
  })

  it('leaves the existing strengths where they were, so stored Light is still Light', () => {
    expect(SURFACE_STRENGTH_FRACTION.light).toBe(0.55)
    expect(resolveSurface({ backgroundStrength: 'light' })).toEqual({ strength: 'light' })
  })
})

describe('ringSurfaceLook', () => {
  it('is the layout’s own classes with nothing chosen', () => {
    expect(ringSurfaceLook({}, OWN)).toEqual({
      className: `${OWN.background} ${OWN.border}`,
      style: undefined,
    })
  })

  it('draws None as no border at all', () => {
    expect(ringSurfaceLook({ border: 'none' }, OWN).className).toContain('ring-0')
    expect(ringSurfaceLook({ border: 'none' }, OWN).className).not.toContain('ring-line')
  })

  it('keeps the width when only the colour changes, and the colour when only the width does', () => {
    const colour = ringSurfaceLook({ borderColour: '#b8962e' }, OWN)
    expect(colour.className).toContain('ring-1 ring-inset ring-(--surface-border)')
    expect(colour.style).toEqual({ '--surface-border': '#b8962e' })
    const width = ringSurfaceLook({ border: 'thick' }, OWN)
    expect(width.className).toContain('ring-3')
    expect(width.style).toEqual({ '--surface-border': 'var(--color-line)' })
  })

  it('tints at a strength, and a transparent fill is really transparent', () => {
    expect(ringSurfaceLook({ background: '#0b4a4c', strength: 'medium' }, OWN).style).toEqual({
      '--surface-bg': 'color-mix(in oklch, #0b4a4c 70%, transparent)',
    })
    expect(ringSurfaceLook({ background: 'transparent' }, OWN).style).toEqual({
      '--surface-bg': 'transparent',
    })
  })
})

describe('glassSurfaceLook', () => {
  it('tints the glass at its own strength and adds no class, so the blur and shadow stay', () => {
    const look = glassSurfaceLook({ background: '#0b4a4c' }, { strength: 'strong' })
    expect(look.className).toBe('')
    expect(look.style).toEqual({
      '--glass-tint': 'color-mix(in oklch, #0b4a4c 85%, transparent)',
      '--glass-tint-solid': 'color-mix(in oklch, #0b4a4c 95%, transparent)',
    })
  })

  it('outlines the glass, and None is a zero width, not the glass’s own border', () => {
    expect(
      glassSurfaceLook({ border: 'thick', borderColour: '#b8962e' }, { strength: 'medium' }).style,
    ).toEqual({
      '--glass-border-width': '3px',
      '--glass-border-colour': '#b8962e',
    })
    expect(glassSurfaceLook({ border: 'none' }, { strength: 'medium' }).style).toEqual({
      '--glass-border-width': '0px',
    })
  })

  it('leaves the glass alone with nothing chosen', () => {
    expect(glassSurfaceLook({}, { strength: 'medium' })).toEqual({
      className: '',
      style: undefined,
    })
  })

  it('keeps the readable fallback surface for a transparent tint', () => {
    expect(glassSurfaceLook({ background: 'transparent' }, { strength: 'medium' }).style).toEqual({
      '--glass-tint': 'transparent',
    })
  })
})

describe('iconLook', () => {
  const GLASS = {
    shape: 'circle',
    background: 'bg-surface-alt',
    border: 'ring-1 ring-inset ring-line',
    colour: 'text-ink',
  } as const

  it('is the layout’s badge with nothing chosen', () => {
    expect(iconLook({}, GLASS).className).toBe(
      'rounded-full bg-surface-alt ring-1 ring-inset ring-line text-ink',
    )
  })

  it('draws a plain icon with no container, keeping its colour', () => {
    const look = iconLook(
      resolveIconDesign({ iconShape: 'plain', iconColour: { colour: 'highlight' } }),
      GLASS,
    )
    expect(look).toEqual({
      shape: 'plain',
      className: '',
      style: { color: 'var(--color-highlight)' },
    })
  })

  it('outlines a transparent circle in gold, the reference treatment', () => {
    const look = iconLook(
      resolveIconDesign({
        iconShape: 'circle',
        iconBackground: { colour: 'transparent' },
        iconBorder: 'thin',
        iconBorderColour: { colour: 'custom', hex: '#b8962e' },
      }),
      GLASS,
    )
    expect(look.className).toContain('rounded-full')
    expect(look.className).toContain('ring-1 ring-inset ring-(--surface-border)')
    expect(look.style).toMatchObject({
      '--surface-bg': 'transparent',
      '--surface-border': '#b8962e',
    })
  })

  it('gives a layout that draws bare icons a finished container once a shape is chosen', () => {
    const look = iconLook({ shape: 'rounded' }, { shape: 'plain', background: '', border: '' })
    expect(look.className).toBe('rounded-control bg-surface-alt ring-1 ring-inset ring-line')
  })
})
