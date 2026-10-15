import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'
import { contrastRatio } from '@/lib/color/contrast'

import { resolveDesignTokens } from './resolve-design-tokens'

const AA = 4.5

/** A resolved variable that must be there. */
function at(vars: Record<string, string>, name: string): string {
  const value = vars[name]
  if (value === undefined) throw new Error(`${name} was not set`)
  return value
}

describe('resolveDesignTokens', () => {
  it('emits nothing when nothing is set, so the site is exactly tokens.json', () => {
    for (const input of [null, undefined, {}, { appearance: 'light' }, { primary: '' }]) {
      const result = resolveDesignTokens(input)
      expect(result.vars).toEqual({})
      expect(result.css).toBe('')
      expect(result.warnings).toEqual([])
      expect(result.accent).toEqual({ background: colorHex.accent, foreground: colorHex.accentInk })
    }
  })

  describe('overrides', () => {
    it('sets only the roles that are set, plus what is derived from them', () => {
      const { vars, css } = resolveDesignTokens({ primary: '#0b6e4f' })
      expect(vars['--color-accent']).toBe('#0b6e4f')
      expect(vars['--color-cta']).toBe('#0b6e4f')
      expect(vars['--color-accent-ink']).toBe('#ffffff')
      expect(vars['--color-cta-ink']).toBeUndefined() // white already, as in tokens.json
      expect(vars['--color-surface']).toBeUndefined()
      expect(vars['--color-accent-2']).toBeUndefined()
      expect(css.startsWith(':root{')).toBe(true)
      expect(css).toContain('--color-accent:#0b6e4f')
    })

    it('accepts uppercase hex and writes it lowercase', () => {
      expect(resolveDesignTokens({ secondary: '#E4572E' }).vars['--color-accent-2']).toBe('#e4572e')
    })

    it('sets Secondary and Highlight with readable text on each', () => {
      const { vars } = resolveDesignTokens({ secondary: '#ffd166', highlight: '#06d6a0' })
      expect(vars['--color-accent-2']).toBe('#ffd166')
      expect(vars['--color-highlight']).toBe('#06d6a0')
      const ink = (name: string, fallback: string) => vars[`--color-${name}`] ?? fallback
      expect(
        contrastRatio(ink('accent-2-ink', colorHex.accent2Ink), '#ffd166'),
      ).toBeGreaterThanOrEqual(AA)
      expect(
        contrastRatio(ink('highlight-ink', colorHex.highlightInk), '#06d6a0'),
      ).toBeGreaterThanOrEqual(AA)
    })

    it('overrides the advanced surface, ink and line colours', () => {
      const { vars } = resolveDesignTokens({
        surface: '#faf5ee',
        surfaceAlt: '#efe6d8',
        ink: '#2b2118',
        inkMuted: '#5c4b3a',
        line: '#d9ccb8',
      })
      expect(vars).toMatchObject({
        '--color-surface': '#faf5ee',
        '--color-surface-alt': '#efe6d8',
        '--color-ink': '#2b2118',
        '--color-ink-muted': '#5c4b3a',
        '--color-line': '#d9ccb8',
      })
    })

    it('derives the tints from a new surface when only the surface is set', () => {
      const { vars } = resolveDesignTokens({ surface: '#faf5ee' })
      expect(vars['--color-surface-alt']).toBeDefined()
      expect(vars['--color-line']).toBeDefined()
      expect(vars['--color-surface-alt']).not.toBe(colorHex.surfaceAlt)
    })

    it('ignores invalid hex values', () => {
      const result = resolveDesignTokens({
        primary: 'red',
        secondary: '#fff',
        highlight: '#12345',
        surface: 'url(javascript:alert(1))',
        ink: '#gggggg',
        appearance: 'sepia',
      })
      expect(result.vars).toEqual({})
      expect(result.css).toBe('')
    })
  })

  describe('contrast', () => {
    it('picks near-black text on a light primary and white on a dark one', () => {
      const light = at(resolveDesignTokens({ primary: '#ffd166' }).vars, '--color-accent-ink')
      const dark = at(resolveDesignTokens({ primary: '#0b3d91' }).vars, '--color-accent-ink')
      expect(light).toBe('#030712')
      expect(dark).toBe('#ffffff')
    })

    it('always reaches AA for text on the primary, across the hue wheel', () => {
      for (let hue = 0; hue < 360; hue += 20) {
        for (const lightness of [0.3, 0.5, 0.65, 0.8]) {
          const primary = hslToHex(hue, 80, lightness * 100)
          const { vars } = resolveDesignTokens({ primary })
          expect(
            contrastRatio(at(vars, '--color-accent-ink'), primary),
            `${primary} -> ${vars['--color-accent-ink']}`,
          ).toBeGreaterThanOrEqual(AA)
        }
      }
    })

    it('darkens accent-coloured text, not the button, when the primary is too light for the page', () => {
      const result = resolveDesignTokens({ primary: '#ffd166' })
      expect(result.vars['--color-accent']).toBe('#ffd166')
      const text = at(result.vars, '--color-accent-text')
      expect(text).not.toBe('#ffd166')
      expect(contrastRatio(text, colorHex.surface)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(text, colorHex.surfaceAlt)).toBeGreaterThanOrEqual(AA)
      const warning = result.warnings.find((item) => item.field === 'primary')
      expect(warning?.message).toContain(text)
    })

    it('leaves a primary that already passes unwarned', () => {
      const result = resolveDesignTokens({ primary: '#0b3d91' })
      expect(result.vars['--color-accent-text']).toBe('#0b3d91')
      expect(result.warnings).toEqual([])
      expect(result.checks.every((check) => check.pass)).toBe(true)
    })

    it('reports contrast checks the Studio shows on the primary field', () => {
      const { checks } = resolveDesignTokens({ primary: '#0b3d91' })
      expect(checks.filter((check) => check.fields.includes('primary')).map((c) => c.id)).toEqual([
        'primary-ink',
        'primary-text',
      ])
    })

    it('warns about, and never changes, text colours the editor chose', () => {
      const result = resolveDesignTokens({ ink: '#bbbbbb' })
      expect(result.vars['--color-ink']).toBe('#bbbbbb')
      expect(result.warnings.map((warning) => warning.field)).toContain('ink')
    })

    it('adjusts derived text when a dark surface is set on its own', () => {
      const { vars } = resolveDesignTokens({ surface: '#101820' })
      expect(contrastRatio(at(vars, '--color-ink'), '#101820')).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(at(vars, '--color-ink-muted'), '#101820')).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(at(vars, '--color-accent-text'), '#101820')).toBeGreaterThanOrEqual(AA)
    })

    it('keeps the inverse tone readable when its surface is changed', () => {
      const { vars } = resolveDesignTokens({ surfaceInverse: '#fff3c4' })
      expect(contrastRatio(at(vars, '--color-ink-inverse'), '#fff3c4')).toBeGreaterThanOrEqual(AA)
      expect(
        contrastRatio(at(vars, '--color-ink-inverse-muted'), '#fff3c4'),
      ).toBeGreaterThanOrEqual(AA)
    })

    it('exposes the accent pair for the OG image', () => {
      expect(resolveDesignTokens({ primary: '#0b3d91' }).accent).toEqual({
        background: '#0b3d91',
        foreground: '#ffffff',
      })
    })
  })

  describe('appearance', () => {
    const { vars, css } = resolveDesignTokens({ appearance: 'dark' })

    it('swaps the surface and ink pairs', () => {
      expect(vars['--color-surface']).toBe(colorHex.surfaceInverse)
      expect(vars['--color-surface-inverse']).toBe(colorHex.surface)
      expect(vars['--color-ink']).toBe(colorHex.inkInverse)
      expect(vars['--color-ink-inverse']).toBe(colorHex.ink)
      expect(vars['--color-ink-muted']).toBe(colorHex.inkInverseMuted)
      expect(vars['--color-ink-inverse-muted']).toBeDefined()
    })

    it('tells the browser the page is dark', () => {
      expect(css).toContain('color-scheme:dark')
    })

    it('keeps every text pair at AA', () => {
      const surface = at(vars, '--color-surface')
      for (const name of ['ink', 'ink-muted', 'accent-text', 'danger', 'success', 'warning']) {
        const colour = vars[`--color-${name}`] ?? colorHex[name as keyof typeof colorHex]
        expect(contrastRatio(colour, surface), name).toBeGreaterThanOrEqual(AA)
      }
      expect(
        contrastRatio(at(vars, '--color-ink-muted'), at(vars, '--color-surface-alt')),
      ).toBeGreaterThanOrEqual(AA)
    })

    it('flips the button pair too, and a chosen primary wins over it', () => {
      expect(vars['--color-cta']).toBe(colorHex.surface)
      expect(vars['--color-cta-ink']).toBe(colorHex.ink)
      const branded = resolveDesignTokens({ appearance: 'dark', primary: '#7aa2ff' })
      expect(branded.vars['--color-cta']).toBe('#7aa2ff')
      expect(branded.vars['--color-surface']).toBe(colorHex.surfaceInverse)
    })

    it('lets an advanced override win over the swapped value', () => {
      const result = resolveDesignTokens({ appearance: 'dark', surface: '#0b132b' })
      expect(result.vars['--color-surface']).toBe('#0b132b')
    })
  })

  describe('gradients', () => {
    it('writes a variable per valid gradient with an angle', () => {
      const { vars } = resolveDesignTokens({
        gradients: [
          { name: 'Sunset glow', angle: 90, stops: ['#ff7e5f', '#feb47b'] },
          { name: 'Ocean', angle: 45, stops: ['#2193b0', '#6dd5ed', '#ffffff'] },
        ],
      })
      expect(vars['--gradient-sunset-glow']).toBe('linear-gradient(90deg, #ff7e5f, #feb47b)')
      expect(vars['--gradient-ocean']).toBe('linear-gradient(45deg, #2193b0, #6dd5ed, #ffffff)')
    })

    it('defaults the angle, names unnamed gradients and de-duplicates names', () => {
      const { vars } = resolveDesignTokens({
        gradients: [
          { name: 'Brand', stops: ['#112233', '#445566'] },
          { name: 'brand!', stops: ['#112233', '#445566'] },
          { stops: ['#112233', '#445566'] },
        ],
      })
      expect(Object.keys(vars)).toEqual([
        '--gradient-brand',
        '--gradient-brand-2',
        '--gradient-gradient-3',
      ])
      expect(vars['--gradient-brand']).toContain('135deg')
    })

    it('normalises the angle to 0-359', () => {
      expect(
        resolveDesignTokens({
          gradients: [{ name: 'a', angle: -90, stops: ['#112233', '#445566'] }],
        }).vars['--gradient-a'],
      ).toContain('270deg')
    })

    it('skips gradients with too few, too many or invalid stops', () => {
      const { vars } = resolveDesignTokens({
        gradients: [
          { name: 'one', stops: ['#112233'] },
          { name: 'four', stops: ['#111111', '#222222', '#333333', '#444444'] },
          { name: 'bad', stops: ['#112233', 'red'] },
          null,
        ],
      })
      expect(vars).toEqual({})
    })

    it('warns about stops that vanish into the background', () => {
      const { warnings } = resolveDesignTokens({
        gradients: [{ name: 'Pale', stops: ['#fafafa', '#0b3d91'] }],
      })
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toMatchObject({ field: 'gradients' })
      expect(warnings[0]?.message).toContain('stop 1')
    })
  })

  it('only ever emits hex colours, plain gradients and color-scheme (no injectable text)', () => {
    const { css } = resolveDesignTokens({
      appearance: 'dark',
      primary: '#0b3d91',
      gradients: [{ name: '};body{display:none', stops: ['#112233', '#445566'] }],
    })
    expect(css).not.toContain('display:none')
    expect(css).toMatch(/^:root\{[a-z0-9#:;(), .-]+\}$/)
  })
})

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}
