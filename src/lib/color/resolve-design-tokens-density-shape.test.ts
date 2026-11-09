import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from './resolve-design-tokens'

describe('resolveDesignTokens with the real density and shape choices', () => {
  it('emits nothing for Standard, Soft or unset, so the site is exactly tokens.json', () => {
    expect(resolveDesignTokens({}).css).toBe('')
    expect(resolveDesignTokens({ density: 'standard', shape: 'soft' }).css).toBe('')
    expect(resolveDesignTokens({ density: null, shape: null })).toEqual(resolveDesignTokens({}))
  })

  it('sets the Default section spacing on :root for Airy, and no other spacing token', () => {
    const { vars, css } = resolveDesignTokens({ density: 'airy' })
    expect(vars).toEqual({ '--spacing-section': '7.5rem', '--spacing-gutter': '1.875rem' })
    expect(css).toContain('--spacing-section:')
    expect(css).not.toContain('--spacing-section-compact')
    expect(css).not.toContain('--spacing-section-spacious')
  })

  it('sets the radii for Round beside the colours, without changing the colours', () => {
    const colourOnly = resolveDesignTokens({ primary: '#0b6e4f' })
    const withShape = resolveDesignTokens({ primary: '#0b6e4f', shape: 'round' })
    expect(withShape.vars['--radius-card']).toBe('1.75rem')
    expect(withShape.colours).toEqual(colourOnly.colours)
    expect(withShape.warnings).toEqual(colourOnly.warnings)
  })
})
