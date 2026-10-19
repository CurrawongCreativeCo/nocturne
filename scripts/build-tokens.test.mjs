import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  build,
  buildCss,
  hexToRgb,
  oklchToRgb,
  paths,
  readTokens,
  validateTokens,
} from './build-tokens.mjs'

describe('glass tokens', () => {
  it('are in the shipped tokens.json and become per-element variables that follow the tone', () => {
    const css = buildCss(readTokens())
    expect(css).toContain('--glass-blur: 14px;')
    expect(css).toContain(
      '--glass-surface: color-mix(in oklch, var(--color-surface) 70%, transparent);',
    )
    expect(css).toContain(
      '.glass-row-light {\n    --glass-surface: color-mix(in oklch, var(--color-surface) 55%',
    )
    expect(css).toContain(
      '.glass-row-strong {\n    --glass-surface: color-mix(in oklch, var(--color-surface) 85%',
    )
    // Not at :root: a tone redefines --color-surface lower down, and :root would have fixed it already.
    expect(css).not.toMatch(/:root \{[^}]*--glass-surface/)
  })

  it('are optional, so a client file without them still builds', () => {
    const { glass: _glass, ...tokens } = readTokens()
    expect(validateTokens(tokens)).toEqual([])
    expect(buildCss(tokens)).toContain('.glass-row')
  })

  it('reject strengths out of order, a blur outside 12-16px and unknown names', () => {
    const tokens = readTokens()
    const errors = validateTokens({
      ...tokens,
      glass: { ...tokens.glass, light: '0.9', blur: '30px', frost: '1' },
    })
    expect(errors).toContain('glass: light, medium and strong must increase')
    expect(errors).toContain('glass.blur must be 12px to 16px (px or rem)')
    expect(errors).toContain('glass.frost is not a known token')
  })
})

describe('design token generator', () => {
  it('writes files equal to the committed ones (run `npm run tokens` if this fails)', () => {
    const { css, ts } = build()
    expect(readFileSync(paths.css, 'utf8')).toBe(css)
    expect(readFileSync(paths.ts, 'utf8')).toBe(ts)
  })

  it('accepts the shipped tokens.json', () => {
    expect(validateTokens(readTokens())).toEqual([])
  })

  it('reports a missing token and a hex that drifted from its oklch value', () => {
    const tokens = readTokens()
    const { ink: _ink, ...colors } = tokens.color
    const errors = validateTokens({
      ...tokens,
      color: { ...colors, accent: { oklch: 'oklch(0.55 0.2 264)', hex: '#ff0000' } },
    })
    expect(errors).toContain('color.ink is missing')
    expect(errors.some((error) => error.startsWith('color.accent: hex #ff0000'))).toBe(true)
  })

  it('rejects a type token that is not a clamp() and a hex next/og cannot read', () => {
    const tokens = readTokens()
    const errors = validateTokens({
      ...tokens,
      type: { ...tokens.type, h1: { ...tokens.type.h1, size: '3rem' } },
      color: { ...tokens.color, line: { oklch: 'oklch(0.9 0 0)', hex: 'oklch(0.9 0 0)' } },
    })
    expect(errors).toContain('type.h1.size must be a clamp()')
    expect(errors.some((error) => error.startsWith('color.line.hex'))).toBe(true)
  })

  it('maps space tokens to the Tailwind namespaces behind py-section, px-gutter, max-w-measure', () => {
    const css = buildCss(readTokens())
    expect(css).toMatch(/--spacing-section: 6rem;/)
    expect(css).toMatch(/--spacing-section-compact: /)
    expect(css).toMatch(/--spacing-gutter: /)
    expect(css).toMatch(/--container-measure: /)
  })

  it('converts oklch to the sRGB values browsers show', () => {
    expect(oklchToRgb('oklch(1 0 0)').map(Math.round)).toEqual([255, 255, 255])
    expect(oklchToRgb('oklch(0 0 0)').map(Math.round)).toEqual([0, 0, 0])
    expect(oklchToRgb('oklch(0.55 0.2 264)').map(Math.round)).toEqual(hexToRgb('#3266e4'))
  })
})

describe('depth tokens', () => {
  it('writes the picture shadows and glow sizes to :root, and the floating box shadow to the theme', () => {
    const css = buildCss(readTokens())
    expect(css).toMatch(/:root \{[^}]*--depth-picture-raised: drop-shadow\(/)
    expect(css).toContain('--depth-glow-soft: 0 0 18px 0;')
    expect(css).toContain('--depth-glow-strong-strength: 55%;')
    expect(css).toContain('--shadow-floating:')
  })

  it('falls back to the defaults when tokens.json has no depth group', () => {
    const { depth: _depth, ...tokens } = readTokens()
    expect(buildCss(tokens)).toContain('--depth-picture-soft: drop-shadow(')
  })
})
