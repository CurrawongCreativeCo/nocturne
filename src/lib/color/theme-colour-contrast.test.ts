import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { contrastRatio } from './contrast'
import { glassAreas, glassRowsStrength, glassWorstCase, glassWorstRatio } from './glass-contrast'
import { emphasisContrastProblems, stopContrast, tonePalette } from './heading-contrast'
import { resolveDesignTokens } from './resolve-design-tokens'
import { themeColourContrast, themeColourHex } from './theme-colour-contrast'

// A sample "Brand colours" override: a pale yellow Primary and Secondary, as a client might choose.
const BRAND = resolveDesignTokens({ primary: '#ffd200', secondary: '#ffe14d' }).colours
const DARK = resolveDesignTokens({ appearance: 'dark' }).colours

describe('tonePalette with Brand colours', () => {
  it('builds every tone from the site colours, not tokens.json', () => {
    expect(tonePalette('surface', BRAND).colors.accent).toBe('#ffd200')
    expect(tonePalette('accent', BRAND).background).toBe('#ffd200')
    expect(tonePalette('inverse', BRAND).colors.accent).not.toBe(
      tonePalette('inverse').colors.accent,
    )
    expect(tonePalette('surface', DARK).background).toBe(DARK.surface)
    expect(DARK.surface).not.toBe(colorHex.surface)
  })

  it('is tokens.json when no colours are given', () => {
    expect(tonePalette('accent').background).toBe(colorHex.accent)
  })
})

describe('themeColourHex with Brand colours', () => {
  it('draws Primary as the page does: the adjusted text colour on a light tone, Primary itself on the brand tone', () => {
    expect(themeColourHex('accent', null, 'surface', BRAND)).toBe(BRAND.accentText)
    expect(themeColourHex('accent', null, 'surface', BRAND)).not.toBe(colorHex.accentText)
    expect(themeColourHex('accent-2', null, 'surface', BRAND)).toBe('#ffe14d')
    expect(themeColourHex('highlight', null, 'surface', BRAND)).toBe(BRAND.highlight)
  })

  it('follows the dark appearance', () => {
    expect(themeColourHex('ink', null, 'surface', DARK)).toBe(DARK.ink)
    expect(themeColourHex('muted', null, 'surface', DARK)).toBe(DARK.inkMuted)
    expect(themeColourHex('ink', null, 'surface', DARK)).not.toBe(colorHex.ink)
  })

  it('keeps a Custom colour as typed', () => {
    expect(themeColourHex('custom', '#123456', 'surface', BRAND)).toBe('#123456')
  })
})

describe('themeColourContrast with Brand colours', () => {
  it('fails a pale Secondary that the default Secondary would pass', () => {
    const before = themeColourContrast('accent-2', null, 'surface', 'graphic')
    const after = themeColourContrast('accent-2', null, 'surface', 'graphic', { site: BRAND })
    expect(before?.pass).toBe(true)
    expect(after?.pass).toBe(false)
    expect(after?.foreground).toBe('#ffe14d')
    expect(after?.background).toBe(BRAND.surface)
    expect(after?.ratio).toBeCloseTo(contrastRatio('#ffe14d', BRAND.surface), 5)
  })

  it('measures on the dark site background', () => {
    const check = themeColourContrast('ink', null, 'surface', 'text', { site: DARK })
    expect(check?.background).toBe(DARK.surface)
    expect(check?.pass).toBe(true)
  })

  it('suggests a shade for a failing Custom colour against the site background', () => {
    const check = themeColourContrast('custom', '#444444', 'surface', 'text', { site: DARK })
    expect(check?.pass).toBe(false)
    expect(check?.suggestion).not.toBeNull()
  })
})

describe('heading checks with Brand colours', () => {
  it('flags a pale Primary used for the brand highlight, which the default passes', () => {
    expect(emphasisContrastProblems('surface', [{ treatment: 'brand' }])).toEqual([])
    const [problem] = emphasisContrastProblems('surface', [{ treatment: 'brand' }], [], BRAND)
    expect(problem?.treatment).toBe('brand')
  })

  it('reads a heading stop against the site background', () => {
    expect(stopContrast('surface', '#102030', DARK).pass).toBe(false)
    expect(stopContrast('surface', '#102030').pass).toBe(true)
  })
})

describe('themeColourContrast on glass', () => {
  it('measures the worst photo, never better than the plain background', () => {
    const glass = themeColourContrast('ink', null, 'surface', 'text', { glass: 'light' })
    const plain = themeColourContrast('ink', null, 'surface', 'text')
    expect(glass?.ratio).toBeLessThanOrEqual(plain?.ratio ?? 0)
    expect(glass?.ratio).toBeCloseTo(glassWorstRatio('surface', 'light'), 5)
    expect(glassAreas('surface', 'light')).toContain(glass?.background)
  })

  it('builds the glass from the site colours', () => {
    const glass = themeColourContrast('ink', null, 'inverse', 'text', {
      glass: 'medium',
      site: DARK,
    })
    expect(glassAreas('inverse', 'medium', DARK)).toContain(glass?.background)
    expect(glassAreas('inverse', 'medium', DARK)).not.toEqual(glassAreas('inverse', 'medium'))
  })

  it('shows a weaker strength as worse', () => {
    expect(glassWorstCase('#000000', 'surface', 'light').ratio).toBeLessThan(
      glassWorstCase('#000000', 'surface', 'strong').ratio,
    )
  })
})

describe('glassRowsStrength', () => {
  it('is set only for Minimal with glass rows', () => {
    expect(glassRowsStrength({ rowStyle: 'glass' })).toBe('medium')
    expect(
      glassRowsStrength({ variant: 'stacked', rowStyle: 'glass', glassStrength: 'strong' }),
    ).toBe('strong')
    expect(glassRowsStrength({ variant: 'cards', rowStyle: 'glass' })).toBeNull()
    expect(glassRowsStrength({ rowStyle: 'solid' })).toBeNull()
    expect(glassRowsStrength(undefined)).toBeNull()
  })
})
