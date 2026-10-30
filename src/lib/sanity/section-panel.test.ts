import { describe, expect, it } from 'vitest'

import { colorHex, glass } from '@/config/tokens.generated'
import { BODY_TEXT_RATIO } from '@/lib/color/background-contrast'

import {
  PANEL_MAX_OPACITY,
  accentTint,
  gradientSamples,
  panelBackdrop,
  panelChoice,
  panelConfidence,
  panelDomProps,
  panelFill,
  panelProblem,
  resolvePanel,
  resolveSectionPanel,
} from './section-panel'

const solid = { kind: 'solid' } as const
const varied = { kind: 'varied' } as const

describe('panelBackdrop', () => {
  it('is solid with nothing behind the content', () => {
    expect(panelBackdrop({ hasPicture: false })).toEqual(solid)
  })

  it.each([
    ['a picture', { hasPicture: true }],
    ['a hero’s own background', { hasPicture: false, hasOwnBackground: true }],
    ['a gradient whose stops are unknown', { hasPicture: false, hasUnknownGradient: true }],
    ['a section edge, parallax or float layer', { hasPicture: false, overlaps: true }],
  ])('is varied for %s', (_name, section) => {
    expect(panelBackdrop(section)).toEqual(varied)
  })

  it('keeps a gradient’s stops when they are known', () => {
    expect(panelBackdrop({ hasPicture: false, gradientStops: ['#000000', '#ffffff'] })).toEqual({
      kind: 'gradient',
      stops: ['#000000', '#ffffff'],
    })
  })
})

describe('panelChoice', () => {
  it('draws nothing for unset, None or an unknown value', () => {
    expect(panelChoice(undefined)).toBeNull()
    expect(panelChoice('none')).toBeNull()
    expect(panelChoice('frosted')).toBeNull()
    expect(panelChoice('glass')).toBe('glass')
    expect(panelChoice('solid')).toBe('solid')
  })

  it('resolves to no panel, so a section without one renders as it does today', () => {
    expect(resolvePanel({ tone: 'surface', backdrop: solid })).toBeNull()
    expect(resolvePanel({ panel: 'none', tone: 'surface', backdrop: varied })).toBeNull()
  })
})

describe('tinted or frosted', () => {
  it('is tinted over a solid tone, with no blur', () => {
    for (const tone of ['surface', 'alt', 'inverse', 'accent']) {
      expect(resolvePanel({ panel: 'glass', tone, backdrop: solid })?.render).toBe('tinted')
    }
  })

  it('is frosted over a picture and over a gradient', () => {
    expect(resolvePanel({ panel: 'glass', tone: 'inverse', backdrop: varied })?.render).toBe(
      'frosted',
    )
    expect(
      resolvePanel({
        panel: 'glass',
        tone: 'inverse',
        backdrop: { kind: 'gradient', stops: ['#030712', '#1e3a8a'] },
      })?.render,
    ).toBe('frosted')
  })

  it('starts at the strength’s glass token, Medium when unset', () => {
    expect(resolvePanel({ panel: 'glass', tone: 'surface', backdrop: solid })?.opacity).toBe(
      glass.medium,
    )
    expect(
      resolvePanel({ panel: 'glass', strength: 'light', tone: 'surface', backdrop: solid })
        ?.opacity,
    ).toBe(glass.light)
  })

  it('draws Solid card opaque whatever is behind', () => {
    const panel = resolvePanel({ panel: 'solid', tone: 'surface', backdrop: varied })
    expect(panel).toMatchObject({ render: 'solid', opacity: 1, base: 'panel', problem: null })
  })
})

describe('panelFill', () => {
  it('is the tone’s raised surface: lighter on Alt, darker for Inverse, an accent tint for Accent', () => {
    expect(panelFill('surface')).toBe('#f3f4f6')
    expect(panelFill('alt')).toBe('#ffffff')
    expect(panelFill('inverse')).not.toBe('#030712')
    expect(panelFill('accent')).not.toBe('#3266e4')
    expect(accentTint()).toBe('dark')
  })
})

describe('the guaranteed bound', () => {
  it('guarantees text that passes over both black and white', () => {
    // Dark glass at the strongest strength: light text reads over a black or a white picture.
    const result = panelConfidence({ tone: 'inverse', backdrop: varied, opacity: glass.strong })
    expect(result.confidence).toBe('guaranteed')
    expect(result.ratio).toBeGreaterThanOrEqual(BODY_TEXT_RATIO)
  })

  it('fails text that fails over both extremes', () => {
    // Mid-grey text on a mid-grey panel: unreadable over a black picture and over a white one.
    const grey = { ...colorHex, ink: '#808080', inkMuted: '#808080', surfaceAlt: '#808080' }
    expect(
      panelConfidence({ tone: 'surface', backdrop: varied, opacity: 0.5, site: grey }).confidence,
    ).toBe('fails')
  })

  it('is not guaranteed when it passes over one extreme only', () => {
    // Light surface glass: dark text reads over white, but the muted text is weak over black.
    const result = panelConfidence({ tone: 'surface', backdrop: varied, opacity: glass.light })
    expect(result.confidence).toBe('not-guaranteed')
  })

  it('is exact over a solid tone and over a gradient’s stops and samples', () => {
    expect(
      panelConfidence({ tone: 'surface', backdrop: solid, opacity: glass.medium }),
    ).toMatchObject({
      confidence: 'exact',
    })
    const gradient = { kind: 'gradient', stops: ['#030712', '#ffffff'] } as const
    // Dark text fails on the dark stop, however the panel is tinted.
    expect(panelConfidence({ tone: 'surface', backdrop: gradient, opacity: 0.1 }).confidence).toBe(
      'fails',
    )
  })

  it('samples between a gradient’s stops', () => {
    expect(gradientSamples(['#000000', '#ffffff'])).toHaveLength(6)
    expect(gradientSamples(['#000000'])).toEqual(['#000000'])
  })
})

describe('raising the opacity, then falling back to solid', () => {
  it('raises the opacity until text is guaranteed, no further than needed', () => {
    const panel = resolvePanel({
      panel: 'glass',
      strength: 'light',
      tone: 'surface',
      backdrop: varied,
    })
    expect(panel?.raised).toBe(true)
    expect(panel?.opacity).toBeGreaterThan(glass.light)
    expect(panel?.opacity).toBeLessThanOrEqual(PANEL_MAX_OPACITY)
    expect(panel?.confidence).toBe('guaranteed')
    expect(panel?.render).toBe('frosted')
    expect(panel?.problem).toBeNull()
    // One step lower would not have been enough.
    expect(
      panelConfidence({
        tone: 'surface',
        backdrop: varied,
        opacity: Math.round(((panel?.opacity ?? 0) - 0.05) * 100) / 100,
      }).confidence,
    ).not.toBe('guaranteed')
  })

  it('leaves a panel that already reads untouched', () => {
    const panel = resolvePanel({
      panel: 'glass',
      strength: 'strong',
      tone: 'inverse',
      backdrop: varied,
    })
    expect(panel).toMatchObject({ raised: false, opacity: glass.strong, problem: null })
  })

  it('renders solid, with a warning naming the fixes, when no see-through opacity is enough', () => {
    const panel = resolvePanel({
      panel: 'glass',
      tone: 'accent',
      backdrop: varied,
      site: { ...colorHex, accentInk: '#9ca3af' },
    })
    expect(panel?.render).toBe('solid')
    expect(panel?.opacity).toBe(1)
    expect(panel?.problem?.message).toMatch(/stronger overlay/)
    expect(panel?.problem?.message).toMatch(/higher panel strength/)
    expect(panel?.problem?.message).toMatch(/Solid card/)
    expect(panel?.problem?.message).toMatch(/4\.5:1/)
  })

  it('names the fixes that apply when there is no picture', () => {
    const message = panelProblem({
      panel: 'glass',
      tone: 'accent',
      hasPicture: false,
      gradient: 'sky',
      gradients: [{ slug: 'sky', stops: ['#3266e4', '#ffffff'] }],
      site: { ...colorHex, accentInk: '#9ca3af' },
    })
    expect(message).toMatch(/Solid card/)
    expect(message).not.toMatch(/overlay/)
  })

  it('says nothing when the panel reads', () => {
    expect(panelProblem({ panel: 'glass', tone: 'surface', hasPicture: false })).toBeNull()
    expect(panelProblem({ panel: 'solid', tone: 'inverse', hasPicture: true })).toBeNull()
  })
})

describe('panelDomProps', () => {
  it('writes the opacity as a percentage and keeps the render and base for the stylesheet', () => {
    const panel = resolvePanel({ panel: 'glass', tone: 'surface', backdrop: solid })
    if (!panel) throw new Error('expected a panel')
    const props = panelDomProps(panel)
    expect(props).toMatchObject({ render: 'tinted', base: 'panel' })
    expect(props.style).toEqual({ '--panel-opacity': '70%' })
  })
})

describe('resolveSectionPanel: one decision for the site and the Studio', () => {
  const base = { panel: 'glass', tone: 'inverse', hasPicture: false } as const

  it('measures a known gradient exactly, at its stops and between them', () => {
    const panel = resolveSectionPanel({
      ...base,
      gradient: 'dusk',
      gradients: [{ slug: 'dusk', stops: ['#0b3d2e', '#1b2a3b'] }],
    })
    expect(panel).toMatchObject({ render: 'frosted', confidence: 'exact' })
  })

  it('uses the conservative bound, and never says exact, when the stops are unknown', () => {
    const panel = resolveSectionPanel({ ...base, gradient: 'dusk' })
    expect(panel?.render).toBe('frosted')
    expect(panel?.confidence).toBe('guaranteed')
  })

  it('draws a gradient that left Design settings as the plain tone', () => {
    const panel = resolveSectionPanel({ ...base, gradient: 'gone', gradients: [] })
    expect(panel?.render).toBe('tinted')
  })

  it('a picture covers the gradient', () => {
    const panel = resolveSectionPanel({
      ...base,
      hasPicture: true,
      gradient: 'dusk',
      gradients: [{ slug: 'dusk', stops: ['#0b3d2e'] }],
    })
    expect(panel?.confidence).not.toBe('exact')
  })

  it('follows the site’s own colours, not tokens.json', () => {
    // A site whose Inverse background is pale: tokens.json's white text on it would fail.
    const site = { ...colorHex, surfaceInverse: '#f5f5f5' }
    const own = resolveSectionPanel({ ...base, site })
    const template = resolveSectionPanel(base)
    expect(template?.problem).toBeNull()
    expect(own?.render).toBe('solid')
    expect(own?.problem).not.toBeNull()
  })
})
