import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'

import { buttonPreview, PREVIEW_GLOW } from './button-preview'

const preview = (choices: Parameters<typeof resolveDesignTokens>[0] = {}) => {
  const { vars, colours } = resolveDesignTokens(choices)
  return buttonPreview(vars, colours)
}

describe('the Brand colours button preview', () => {
  it('supplies the same glow sizes as the generated tokens', () => {
    const css = readFileSync('src/styles/tokens.generated.css', 'utf8')
    for (const [name, value] of Object.entries(PREVIEW_GLOW)) {
      expect(css).toContain(`${name}: ${value};`)
    }
  })

  it('draws today’s buttons when nothing is chosen: the Primary fill, no shadow, an outline', () => {
    const { scope, primary, secondary } = preview()
    expect(Object.keys(scope).filter((name) => name.startsWith('--button-'))).toEqual([])
    expect(primary.background).toMatch(/^var\(--button-fill, #/)
    expect(primary.boxShadow).toBe('var(--button-depth, 0 0 #0000), var(--button-glow, 0 0 #0000)')
    expect(secondary.background).toBe('var(--button-secondary-fill, transparent)')
    expect(secondary.boxShadow).toMatch(/^inset 0 0 0 1px var\(--button-secondary-ring, #/)
  })

  it('hands the site’s own button variables to the preview, and nothing else from the site', () => {
    const { scope } = preview({
      buttonFill: 'gradient',
      buttonGradient: 'night',
      gradients: [{ name: 'Night', angle: 90, stops: ['#0b1d3a', '#1f3b73'] }],
      buttonDepth: 'raised',
      buttonGlow: 'strong',
      secondaryButton: 'soft',
      density: 'airy',
    })
    const names = Object.keys(scope)
    expect(names).toEqual(
      expect.arrayContaining([
        '--button-fill',
        '--button-fill-ink',
        '--button-depth',
        '--button-glow',
        '--button-secondary-fill',
        '--button-secondary-ring',
      ]),
    )
    expect(names).not.toContain('--spacing-section')
  })

  it('does not preview a gradient that falls back to Solid', () => {
    const { scope } = preview({ buttonFill: 'gradient', buttonGradient: 'gone', gradients: [] })
    expect(scope).not.toHaveProperty('--button-fill')
  })
})
