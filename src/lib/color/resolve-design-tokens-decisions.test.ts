import { vercelStegaCombine } from '@vercel/stega'
import { describe, expect, it, vi } from 'vitest'

import { FIXTURE_DECISIONS } from '@/lib/design/site-decisions-fixtures'

// Stands the fixtures in for the production registry (empty until 216b and 146 register theirs), so
// the real resolveDesignTokens integration is what runs.
vi.mock('@/lib/design/site-decisions', async (importOriginal) => {
  const actual = await importOriginal<{
    siteDecisionVars: (input: object, decisions: object) => unknown
  }>()
  return {
    ...actual,
    siteDecisionVars: (input: object) => actual.siteDecisionVars(input, FIXTURE_DECISIONS),
  }
})

const { resolveDesignTokens } = await import('./resolve-design-tokens')

describe('resolveDesignTokens with site decisions', () => {
  it('leaves the output exactly as it was when no decision is set', () => {
    expect(resolveDesignTokens(undefined).css).toBe('')
    expect(resolveDesignTokens({}).css).toBe('')
    const colour = resolveDesignTokens({ primary: '#0b6e4f' })
    expect(resolveDesignTokens({ primary: '#0b6e4f', density: null } as never)).toEqual(colour)
    expect(resolveDesignTokens({ primary: '#0b6e4f' }, undefined)).toEqual(colour)
  })

  it('emits nothing for the choice that equals today', () => {
    expect(resolveDesignTokens({ density: 'standard', shape: 'soft' } as never).css).toBe('')
  })

  it('emits the variables beside the colours, after them', () => {
    const { vars, css } = resolveDesignTokens({ primary: '#0b6e4f', shape: 'round' } as never)
    expect(vars['--radius-card']).toBe('1.75rem')
    const names = Object.keys(vars)
    expect(names.indexOf('--radius-card')).toBeGreaterThan(names.indexOf('--color-accent'))
    expect(css).toContain('--radius-card:1.75rem')
  })

  it('does not change any colour, check or warning', () => {
    const plain = resolveDesignTokens({ appearance: 'dark', primary: '#0b6e4f' })
    const decided = resolveDesignTokens({
      appearance: 'dark',
      primary: '#0b6e4f',
      density: 'airy',
    } as never)
    expect(decided.colours).toEqual(plain.colours)
    expect(decided.checks).toEqual(plain.checks)
    expect(decided.warnings).toEqual(plain.warnings)
  })

  it('reads a choice from a draft-mode (stega) value', () => {
    const { vars } = resolveDesignTokens({
      shape: vercelStegaCombine('round', { origin: 'sanity' }),
    } as never)
    expect(vars['--radius-card']).toBe('1.75rem')
  })
})
