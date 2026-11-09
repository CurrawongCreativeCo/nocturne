import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'

import { SITE_DECISIONS, siteDecisionVars, type SiteDecision } from './site-decisions'

const tokens = JSON.parse(readFileSync(join(process.cwd(), 'src/styles/tokens.json'), 'utf8')) as {
  space: Record<string, string>
  radius: Record<string, string>
}

/** The variable each tokens.json space and radius token becomes (scripts/build-tokens.mjs). */
const todays: Record<string, string> = {}
for (const [name, value] of Object.entries(tokens.space)) {
  todays[
    name.startsWith('section-y') ? `--spacing-${name.replace('-y', '')}` : `--spacing-${name}`
  ] = value
}
for (const [name, value] of Object.entries(tokens.radius)) todays[`--radius-${name}`] = value

describe('the decision tables', () => {
  const choices = Object.entries(SITE_DECISIONS).flatMap(([name, { choices }]) =>
    Object.entries(choices).map(([choice, vars]) => ({ name, choice, vars })),
  )

  it.each(choices)(
    '$name $choice sets only existing tokens, each to a different value',
    ({ vars }) => {
      for (const [name, value] of Object.entries(vars)) {
        expect(todays, `${name} is not a token`).toHaveProperty([name])
        expect(value, `${name} equals today's value`).not.toBe(todays[name])
      }
    },
  )

  it('has one choice per decision that leaves the site as tokens.json draws it', () => {
    for (const { choices } of Object.values(SITE_DECISIONS)) {
      expect(Object.values(choices).filter((vars) => Object.keys(vars).length === 0)).toHaveLength(
        1,
      )
    }
  })

  it('moves all three section spacing steps together, so a section keeps its own relative choice', () => {
    for (const choice of ['compact', 'airy'] as const) {
      const vars = SITE_DECISIONS.density.choices[choice]
      expect(Object.keys(vars)).toEqual(
        expect.arrayContaining([
          '--spacing-section-compact',
          '--spacing-section',
          '--spacing-section-spacious',
        ]),
      )
    }
  })
})

describe('siteDecisionVars', () => {
  it('is empty when nothing is set', () => {
    expect(siteDecisionVars(undefined)).toEqual({})
    expect(siteDecisionVars(null)).toEqual({})
    expect(siteDecisionVars({})).toEqual({})
    expect(siteDecisionVars({ density: null, shape: null })).toEqual({})
  })

  it('maps a choice to its variables', () => {
    expect(siteDecisionVars({ shape: 'round' })).toEqual(SITE_DECISIONS.shape.choices.round)
  })

  it('emits nothing for the choice that equals today, an unknown choice or a non-string', () => {
    expect(siteDecisionVars({ density: 'standard', shape: 'soft' })).toEqual({})
    expect(siteDecisionVars({ density: 'cosy', shape: 7 })).toEqual({})
    expect(siteDecisionVars({ density: '__proto__', shape: 'toString' })).toEqual({})
  })

  it('combines independent decisions', () => {
    const vars = siteDecisionVars({ density: 'airy', shape: 'sharp' })
    expect(vars).toEqual({
      ...SITE_DECISIONS.density.choices.airy,
      ...SITE_DECISIONS.shape.choices.sharp,
    })
  })

  it('resolves against any registry, so another decision needs no new wiring', () => {
    const depth: SiteDecision<'flat' | 'floating'> = {
      field: 'cardDepth',
      choices: { flat: {}, floating: { '--depth-card': 'var(--shadow-floating)' } },
    }
    expect(siteDecisionVars({ cardDepth: 'floating' }, { depth })).toEqual({
      '--depth-card': 'var(--shadow-floating)',
    })
    expect(siteDecisionVars({ cardDepth: 'floating' })).toEqual({})
  })
})

describe('through resolveDesignTokens', () => {
  it('leaves the output exactly as it was when no decision is set', () => {
    expect(resolveDesignTokens(undefined).css).toBe('')
    expect(resolveDesignTokens({ density: 'standard', shape: 'soft' }).css).toBe('')
    const colour = resolveDesignTokens({ primary: '#0b6e4f' })
    expect(resolveDesignTokens({ primary: '#0b6e4f', density: null, shape: 'nope' })).toEqual(
      colour,
    )
  })

  it('emits the variables beside the colours, after them', () => {
    const { vars, css } = resolveDesignTokens({ primary: '#0b6e4f', shape: 'round' })
    expect(vars['--radius-card']).toBe('1.75rem')
    expect(vars['--color-accent']).toBe('#0b6e4f')
    expect(Object.keys(vars).indexOf('--radius-card')).toBeGreaterThan(
      Object.keys(vars).indexOf('--color-accent'),
    )
    expect(css).toContain('--radius-card:1.75rem')
  })

  it('does not change any colour or check', () => {
    const plain = resolveDesignTokens({ appearance: 'dark', primary: '#0b6e4f' })
    const decided = resolveDesignTokens({ appearance: 'dark', primary: '#0b6e4f', density: 'airy' })
    expect(decided.colours).toEqual(plain.colours)
    expect(decided.checks).toEqual(plain.checks)
    expect(decided.warnings).toEqual(plain.warnings)
  })

  it('reads a choice from a draft-mode (stega) value', async () => {
    const { vercelStegaCombine } = await import('@vercel/stega')
    const { vars } = resolveDesignTokens({
      shape: vercelStegaCombine('round', { origin: 'sanity' }),
    })
    expect(vars['--radius-card']).toBe('1.75rem')
  })
})
