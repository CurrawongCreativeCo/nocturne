import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveSectionStyle } from '@/components/ui/section-style'
import { SHADOW_LEVELS } from '@/lib/sanity/depth-options'

import { SITE_DECISIONS, siteDecisionVars, type SiteDecision } from './site-decisions'
import { FIXTURE_DECISIONS, density, shape } from './site-decisions-fixtures'

describe('the production registry', () => {
  it('registers density, shape and Card depth', () => {
    expect(Object.keys(SITE_DECISIONS)).toEqual(['density', 'shape', 'cardDepth'])
  })

  it('defines --card-depth only for a chosen level, Soft included, and never touches --shadow-card', () => {
    expect(siteDecisionVars({})).toEqual({})
    expect(siteDecisionVars({ cardDepth: null })).toEqual({})
    expect(siteDecisionVars({ cardDepth: 'unheard-of' })).toEqual({})
    expect(siteDecisionVars({ cardDepth: 'flat' })).toEqual({ '--card-depth': '0 0 #0000' })
    expect(siteDecisionVars({ cardDepth: 'soft' })).toEqual({
      '--card-depth': 'var(--shadow-soft, var(--shadow-card))',
    })
    expect(siteDecisionVars({ cardDepth: 'raised' })).toEqual({
      '--card-depth': 'var(--shadow-raised)',
    })
    expect(siteDecisionVars({ cardDepth: 'floating' })).toEqual({
      '--card-depth': 'var(--shadow-floating)',
    })
    for (const choice of Object.values(SITE_DECISIONS.cardDepth.choices)) {
      expect(Object.keys(choice)).not.toContain('--shadow-card')
    }
  })

  it('offers the same four levels as a section’s own depth, so the choices line up', () => {
    expect(Object.keys(SITE_DECISIONS.cardDepth.choices)).toEqual([...SHADOW_LEVELS])
  })
})

describe('density and shape (task 216b)', () => {
  const tokens = JSON.parse(readFileSync('src/styles/tokens.json', 'utf8')) as {
    space: Record<string, string>
    radius: Record<string, string>
  }

  it('emits nothing for Standard and Soft, which are today’s values', () => {
    expect(siteDecisionVars({ density: 'standard', shape: 'soft' })).toEqual({})
    expect(siteDecisionVars({ density: 'unheard-of', shape: '' })).toEqual({})
    expect(tokens.space['section-y']).toBe('6rem')
    expect(tokens.space.gutter).toBe('1.5rem')
    expect(tokens.radius).toMatchObject({ card: '1rem', panel: '1.5rem', control: '0.5rem' })
  })

  it('maps density to the Default section spacing and the gutter, 75% and 125% of today', () => {
    expect(siteDecisionVars({ density: 'compact' })).toEqual({
      '--spacing-section': '4.5rem',
      '--spacing-gutter': '1.125rem',
    })
    expect(siteDecisionVars({ density: 'airy' })).toEqual({
      '--spacing-section': '7.5rem',
      '--spacing-gutter': '1.875rem',
    })
  })

  it('never touches the Compact or Spacious section spacing, so a section’s own choice wins', () => {
    for (const choice of Object.values(SITE_DECISIONS.density.choices)) {
      const names = Object.keys(choice)
      expect(names).not.toContain('--spacing-section-compact')
      expect(names).not.toContain('--spacing-section-spacious')
    }
    // Airy: an unset section reads the variable density moves; one set to Compact reads another.
    const unset = resolveSectionStyle({}).sectionClass
    const compact = resolveSectionStyle({ spacing: 'compact' }).sectionClass
    expect(unset).toContain('py-section ')
    expect(compact).toContain('py-section-compact')
    expect(compact).not.toMatch(/py-section(?!-compact)/)
  })

  it('maps shape to the card, panel and control radii and leaves buttons and pills round', () => {
    expect(siteDecisionVars({ shape: 'sharp' })).toEqual({
      '--radius-card': '0.25rem',
      '--radius-panel': '0.5rem',
      '--radius-control': '0.25rem',
    })
    expect(siteDecisionVars({ shape: 'round' })).toEqual({
      '--radius-card': '1.75rem',
      '--radius-panel': '2.25rem',
      '--radius-control': '0.75rem',
    })
    for (const choice of Object.values(SITE_DECISIONS.shape.choices)) {
      expect(Object.keys(choice)).not.toContain('--radius-button')
      expect(Object.keys(choice)).not.toContain('--radius-pill')
    }
  })

  it('keeps the density order: Compact < Default < Airy, and Airy stays under Spacious', () => {
    const rem = (value: string | undefined) => Number.parseFloat(value ?? '')
    const compact = rem(SITE_DECISIONS.density.choices.compact['--spacing-section'])
    const airy = rem(SITE_DECISIONS.density.choices.airy['--spacing-section'])
    expect(compact).toBeGreaterThan(rem(tokens.space['section-y-compact']))
    expect(airy).toBeLessThan(8)
  })
})

describe('siteDecisionVars', () => {
  const vars = (input: Record<string, unknown> | null | undefined) =>
    siteDecisionVars(input, FIXTURE_DECISIONS)

  it('is empty when nothing is set', () => {
    expect(vars(undefined)).toEqual({})
    expect(vars(null)).toEqual({})
    expect(vars({})).toEqual({})
    expect(vars({ density: null, shape: null })).toEqual({})
  })

  it('maps a choice to its variables', () => {
    expect(vars({ shape: 'round' })).toEqual(shape.choices.round)
  })

  it('emits nothing for the choice that equals today, an unknown choice or a non-string', () => {
    expect(vars({ density: 'standard', shape: 'soft' })).toEqual({})
    expect(vars({ density: 'cosy', shape: 7 })).toEqual({})
    expect(vars({ density: '__proto__', shape: 'toString' })).toEqual({})
  })

  it('combines independent decisions', () => {
    expect(vars({ density: 'airy', shape: 'sharp' })).toEqual({
      ...density.choices.airy,
      ...shape.choices.sharp,
    })
  })

  it('resolves any registry, so Card depth needs no new wiring', () => {
    const depth: SiteDecision<'flat' | 'floating'> = {
      field: 'cardDepth',
      choices: { flat: {}, floating: { '--depth-card': 'var(--shadow-floating)' } },
    }
    expect(siteDecisionVars({ cardDepth: 'floating' }, { depth })).toEqual({
      '--depth-card': 'var(--shadow-floating)',
    })
  })
})
