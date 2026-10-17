import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/color/contrast'

import { colorHex, colorOklch, motion, ogImage } from './tokens.generated'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('generated design tokens', () => {
  it('define every colour of tokens.json in the CSS, oklch first and hex for next/og', () => {
    const tokens = JSON.parse(read('src/styles/tokens.json')) as {
      color: Record<string, { oklch: string; hex: string }>
    }
    const css = read('src/styles/tokens.generated.css')
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(css).toContain(`--color-${name}: ${value.oklch};`)
      expect(Object.values(colorHex)).toContain(value.hex)
      expect(Object.values(colorOklch)).toContain(value.oklch)
    }
  })

  it('keep the deprecated brand aliases pointing at the accent tokens', () => {
    const css = read('src/styles/tokens.generated.css')
    expect(css).toContain('--color-brand: var(--color-accent);')
    expect(css).toContain('--color-brand-foreground: var(--color-accent-ink);')
  })

  it('default the Studio-settable roles to the look the site had without them', () => {
    // Brand colours (Studio, Design → Brand colours) override these; unset, nothing visibly changes.
    expect(colorHex.accentText).toBe(colorHex.accent)
    expect(colorHex.cta).toBe(colorHex.surfaceInverse)
    expect(colorHex.ctaInk).toBe(colorHex.inkInverse)
  })

  it('give the OG image the accent colours', () => {
    expect(ogImage).toEqual({ background: colorHex.accent, foreground: colorHex.accentInk })
  })

  it('expose motion durations in seconds', () => {
    expect(motion.durationFast).toBeLessThan(motion.duration)
    expect(motion.duration).toBeLessThan(motion.durationSlow)
    expect(motion.duration).toBeLessThan(5) // seconds, not milliseconds
  })
})

/** WCAG 2.2 AA for normal-size text. */
const AA = 4.5

describe('colour contrast (WCAG 2.2 AA, 4.5:1)', () => {
  const pairs = [
    ['ink', 'surface'],
    ['ink-muted', 'surface'],
    ['ink-inverse', 'surface-inverse'],
    ['accent-ink', 'accent'],
    ['accent-2-ink', 'accent-2'],
    ['highlight-ink', 'highlight'],
    ['cta-ink', 'cta'],
    // Also used in the default design: muted text on tinted surfaces, links and the accent as text.
    ['ink-muted', 'surface-alt'],
    ['ink-inverse-muted', 'surface-inverse'],
    ['accent', 'surface'],
    ['danger', 'surface'],
    ['danger-ink', 'danger-surface'],
    ['success-ink', 'success-surface'],
    ['warning-ink', 'warning-surface'],
  ] as const

  const hex = (name: string) =>
    colorHex[
      name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()) as keyof typeof colorHex
    ]

  it.each(pairs)('%s on %s', (foreground, background) => {
    expect(contrastRatio(hex(foreground), hex(background))).toBeGreaterThanOrEqual(AA)
  })

  it('lets the focus outline stand out from the page surface (3:1, WCAG 1.4.11)', () => {
    expect(contrastRatio(colorHex.focus, colorHex.surface)).toBeGreaterThanOrEqual(3)
  })
})
