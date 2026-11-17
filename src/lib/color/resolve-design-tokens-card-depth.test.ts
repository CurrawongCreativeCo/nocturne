import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from './resolve-design-tokens'

describe('resolveDesignTokens with a Card depth', () => {
  it('emits nothing, and no --card-depth, while it is unset', () => {
    expect(resolveDesignTokens(undefined).css).toBe('')
    expect(resolveDesignTokens({ cardDepth: null }).css).toBe('')
    expect(resolveDesignTokens({ primary: '#0b6e4f' }).vars).not.toHaveProperty('--card-depth')
  })

  it('emits --card-depth for every explicit choice, Soft included, and leaves --shadow-card alone', () => {
    for (const [choice, value] of [
      ['flat', '0 0 #0000'],
      ['soft', 'var(--shadow-soft, var(--shadow-card))'],
      ['raised', 'var(--shadow-raised)'],
      ['floating', 'var(--shadow-floating)'],
    ] as const) {
      const { vars, css } = resolveDesignTokens({ cardDepth: choice })
      expect(vars['--card-depth']).toBe(value)
      expect(vars).not.toHaveProperty('--shadow-card')
      expect(css).toContain(`--card-depth:${value}`)
    }
  })

  it('does not change colours, checks or warnings', () => {
    const plain = resolveDesignTokens({ appearance: 'dark', primary: '#0b6e4f' })
    const decided = resolveDesignTokens({
      appearance: 'dark',
      primary: '#0b6e4f',
      cardDepth: 'floating',
    })
    expect(decided.colours).toEqual(plain.colours)
    expect(decided.checks).toEqual(plain.checks)
    expect(decided.warnings).toEqual(plain.warnings)
  })
})
