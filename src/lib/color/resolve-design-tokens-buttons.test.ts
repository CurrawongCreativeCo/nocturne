import { describe, expect, it } from 'vitest'

import { SITE_DECISIONS, siteDecisionVars } from '@/lib/design/site-decisions'

import { contrastRatio } from './contrast'
import { gradientInk, gradientSamples } from './gradients'
import { resolveDesignTokens } from './resolve-design-tokens'

const gradient = (name: string, stops: string[]) => ({ name, angle: 90, stops })
const DARK_TO_NAVY = gradient('Night', ['#0b1d3a', '#1f3b73'])
const LIGHT = gradient('Dawn', ['#ffe9c7', '#ffd1dc', '#fff6a8'])
const MIDDLE = gradient('Clash', ['#ffffff', '#000000'])

describe('button decisions leave an unset site as it was (task 148)', () => {
  it('emits nothing for no choice, today’s choices or an unknown one', () => {
    expect(resolveDesignTokens(undefined).css).toBe('')
    expect(resolveDesignTokens({}).css).toBe('')
    expect(
      resolveDesignTokens({
        buttonFill: 'solid',
        buttonDepth: 'flat',
        buttonGlow: 'off',
        secondaryButton: 'outline',
      }).css,
    ).toBe('')
    expect(
      siteDecisionVars({ buttonDepth: 'floating', buttonGlow: 'huge', secondaryButton: '' }),
    ).toEqual({})
  })

  it('a stale gradient name on its own changes nothing while the fill is Solid', () => {
    const resolved = resolveDesignTokens({
      buttonGradient: 'gone',
      gradients: [DARK_TO_NAVY],
    })
    expect(resolved.vars).not.toHaveProperty('--button-fill')
    expect(resolved.warnings).toEqual([])
  })

  it('the button variables are new names: no shadow, colour or card token is remapped', () => {
    for (const name of ['buttonDepth', 'buttonGlow', 'secondaryButton'] as const) {
      for (const vars of Object.values(SITE_DECISIONS[name].choices)) {
        for (const variable of Object.keys(vars)) expect(variable).toMatch(/^--button-/)
      }
    }
  })
})

describe('depth, glow and the secondary style', () => {
  it('Soft and Raised depth reuse the card shadow scale', () => {
    expect(siteDecisionVars({ buttonDepth: 'soft' })).toEqual({
      '--button-depth': 'var(--shadow-soft, var(--shadow-card))',
    })
    expect(siteDecisionVars({ buttonDepth: 'raised' })).toEqual({
      '--button-depth': 'var(--shadow-raised)',
    })
  })

  it('glow uses Task 146’s halo sizes and strengths in the Primary colour', () => {
    expect(siteDecisionVars({ buttonGlow: 'soft' })['--button-glow']).toBe(
      'var(--depth-glow-soft) color-mix(in oklch, var(--color-accent) var(--depth-glow-soft-strength), transparent)',
    )
    expect(siteDecisionVars({ buttonGlow: 'strong' })['--button-glow']).toContain(
      'var(--depth-glow-strong-strength)',
    )
  })

  it('Soft fill tints the button’s own text colour and drops the outline; nothing sets a glow', () => {
    const vars = siteDecisionVars({ secondaryButton: 'soft' })
    expect(vars['--button-secondary-fill']).toBe(
      'color-mix(in srgb, currentColor 10%, transparent)',
    )
    expect(vars['--button-secondary-fill-hover']).toBe(
      'color-mix(in srgb, currentColor 18%, transparent)',
    )
    expect(vars['--button-secondary-ring']).toBe('transparent')
    expect(Object.keys(vars).some((name) => name.includes('glow'))).toBe(false)
  })

  it('joins depth and glow into the one box-shadow list the button reads', () => {
    expect(resolveDesignTokens({}).vars).not.toHaveProperty('--button-shadow')
    expect(resolveDesignTokens({ buttonDepth: 'flat', buttonGlow: 'off' }).vars).not.toHaveProperty(
      '--button-shadow',
    )
    expect(resolveDesignTokens({ buttonDepth: 'raised' }).vars['--button-shadow']).toBe(
      'var(--shadow-raised)',
    )
    expect(resolveDesignTokens({ buttonGlow: 'soft' }).vars['--button-shadow']).toBe(
      siteDecisionVars({ buttonGlow: 'soft' })['--button-glow'],
    )
    const both = resolveDesignTokens({ buttonDepth: 'soft', buttonGlow: 'strong' }).vars
    expect(both['--button-shadow']).toBe(`${both['--button-depth']}, ${both['--button-glow']}`)
  })

  it('reaches the page CSS', () => {
    const { css } = resolveDesignTokens({ buttonDepth: 'raised', buttonGlow: 'soft' })
    expect(css).toContain('--button-depth:var(--shadow-raised)')
    expect(css).toContain('--button-glow:var(--depth-glow-soft)')
  })
})

describe('Brand gradient fill', () => {
  const resolve = (chosen: ReturnType<typeof gradient>, extra = {}) =>
    resolveDesignTokens({
      buttonFill: 'gradient',
      buttonGradient: 'night',
      gradients: [chosen],
      ...extra,
    })

  it('uses the chosen gradient’s own CSS and a text colour that reads along all of it', () => {
    const resolved = resolve(DARK_TO_NAVY)
    expect(resolved.vars['--button-fill']).toBe('linear-gradient(90deg, #0b1d3a, #1f3b73)')
    expect(resolved.vars['--button-fill-ink']).toBe('#ffffff')
    expect(resolved.warnings).toEqual([])
    // Dark gradient, white text: the hover and press veil is black, which only widens the contrast.
    expect(resolved.vars['--button-fill-veil']).toBe('#000000')
    for (const sample of gradientSamples(['#0b1d3a', '#1f3b73'])) {
      expect(contrastRatio('#ffffff', sample)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('picks the dark ink over a light three-stop gradient, checking both transitions', () => {
    const resolved = resolve(LIGHT, { buttonGradient: 'dawn' })
    expect(resolved.vars['--button-fill-ink']).toBe('#030712')
    expect(resolved.vars['--button-fill-veil']).toBe('#ffffff')
    expect(gradientSamples(['#ffe9c7', '#ffd1dc', '#fff6a8'])).toContain('#ffd1dc')
  })

  it('does not trust the endpoints: a gradient whose middle fails keeps Solid and says so', () => {
    // Both ends pass with one ink each, but no single colour covers the whole line.
    const resolved = resolve(MIDDLE, { buttonGradient: 'clash' })
    expect(resolved.vars).not.toHaveProperty('--button-fill')
    expect(resolved.vars).not.toHaveProperty('--button-fill-ink')
    expect(resolved.errors).toEqual([])
    const button = resolved.warnings.filter((warning) => warning.field === 'buttonGradient')
    expect(button).toHaveLength(1)
    expect(button[0]?.message).toContain('stays Solid')
  })

  it('a mid-grey midpoint between two passing ends is caught', () => {
    const stops = ['#000000', '#ffffff']
    expect(gradientInk(stops, 4.5)).toBeUndefined()
    expect(gradientSamples(stops)).toContain('#808080')
  })

  it('falls back to Solid, with a warning and never an error, when the gradient is missing', () => {
    for (const buttonGradient of ['removed', '', null, undefined]) {
      const resolved = resolveDesignTokens({
        buttonFill: 'gradient',
        buttonGradient,
        gradients: [DARK_TO_NAVY],
      })
      expect(resolved.vars).not.toHaveProperty('--button-fill')
      expect(resolved.errors).toEqual([])
      expect(resolved.warnings).toHaveLength(1)
      expect(resolved.warnings[0]?.field).toBe('buttonGradient')
    }
  })

  it('ignores an invalid gradient (one colour, a bad hex) the way sections do', () => {
    const resolved = resolveDesignTokens({
      buttonFill: 'gradient',
      buttonGradient: 'night',
      gradients: [gradient('Night', ['#0b1d3a'])],
    })
    expect(resolved.vars).not.toHaveProperty('--button-fill')
    expect(resolved.warnings).toHaveLength(1)
  })

  it('leaves the other colours and the Solid button’s colours alone', () => {
    const solid = resolveDesignTokens({ primary: '#0b6e4f', gradients: [DARK_TO_NAVY] })
    const gradientOn = resolve(DARK_TO_NAVY, { primary: '#0b6e4f' })
    const {
      '--button-fill': _fill,
      '--button-fill-ink': _ink,
      '--button-fill-veil': _veil,
      ...rest
    } = gradientOn.vars
    expect(rest).toEqual(solid.vars)
  })
})
