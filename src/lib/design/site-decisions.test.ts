import { describe, expect, it } from 'vitest'

import { SHADOW_LEVELS } from '@/lib/sanity/depth-options'

import { SITE_DECISIONS, siteDecisionVars, type SiteDecision } from './site-decisions'
import { FIXTURE_DECISIONS, density, shape } from './site-decisions-fixtures'

describe('the production registry', () => {
  it('registers Card depth, and nothing for density or shape until 216b', () => {
    expect(Object.keys(SITE_DECISIONS)).toEqual(['cardDepth'])
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
