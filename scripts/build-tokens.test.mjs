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
