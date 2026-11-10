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
    expect(siteDecisionVars({ buttonDepth: 'soft' })['--button-depth']).toBe(
      'var(--shadow-soft, var(--shadow-card))',
    )
    expect(siteDecisionVars({ buttonDepth: 'raised' })['--button-depth']).toBe(
      'var(--shadow-raised)',
    )
  })

  it('hover depth is the next level up, on a faded layer, and only where there is a shadow to deepen', () => {
    expect(siteDecisionVars({ buttonDepth: 'flat' })).toEqual({})
    expect(siteDecisionVars({ buttonGlow: 'strong' })).not.toHaveProperty('--button-hover-shadow')
    const soft = siteDecisionVars({ buttonDepth: 'soft' })
    const raised = siteDecisionVars({ buttonDepth: 'raised' })
    expect(soft['--button-hover-shadow']).toBe('var(--shadow-raised)')
    expect(raised['--button-hover-shadow']).toBe('var(--shadow-floating)')
    for (const vars of [soft, raised]) {
      expect(vars['--button-hover-position']).toBe('relative')
      expect(vars['--button-hover-content']).toBe('""')
      expect(vars['--button-hover-translate']).toBe('0 -2px')
    }
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

const buttonWarnings = (resolved: ReturnType<typeof resolveDesignTokens>) =>
  resolved.warnings.filter((warning) => warning.field === 'buttonGradient')

describe('Brand gradient fill', () => {
  const resolve = (chosen: ReturnType<typeof gradient>, extra = {}) =>
    resolveDesignTokens({
      buttonFill: 'gradient',
      buttonGradient: 'night',
      gradients: [chosen],
      ...extra,
    })

  it('still draws, but warns, when most of the gradient is close to a section background', () => {
    // Navy is invisible on the near-black inverse background; Dawn on the white page.
    const night = resolve(DARK_TO_NAVY)
    expect(night.vars['--button-fill']).toBeDefined()
    expect(buttonWarnings(night).map((warning) => warning.message)).toEqual([
      expect.stringContaining('the inverse background'),
    ])
    const dawn = resolve(LIGHT, { buttonGradient: 'dawn' })
    expect(dawn.vars['--button-fill']).toBeDefined()
    expect(buttonWarnings(dawn).map((warning) => warning.message)).toEqual([
      expect.stringContaining('the page background'),
    ])
    expect(night.errors).toEqual([])
    // A mid-tone gradient stands out from both.
    const clear = resolve(gradient('Night', ['#2563eb', '#7c3aed']))
    expect(buttonWarnings(clear)).toEqual([])
  })

  it('uses the chosen gradient’s own CSS and a text colour that reads along all of it', () => {
    const resolved = resolve(DARK_TO_NAVY)
    expect(resolved.vars['--button-fill']).toBe('linear-gradient(90deg, #0b1d3a, #1f3b73)')
    expect(resolved.vars['--button-fill-ink']).toBe('#ffffff')
    // Dark gradient, white text: the hover and press veil is black, which only widens the contrast.
    expect(resolved.vars['--button-fill-veil']).toBe('#000000')
    // Its only warning is that navy is close to the near-black inverse background (checked above).
    expect(buttonWarnings(resolved)).toHaveLength(1)
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

describe('Soft fill falls back to Outline where it would lower the text under 4.5:1', () => {
  const SOFT = { secondaryButton: 'soft' } as const
  const secondaryVars = (vars: Record<string, string>) =>
    Object.keys(vars).filter((name) => name.startsWith('--button-secondary-'))
  const softWarnings = (resolved: ReturnType<typeof resolveDesignTokens>) =>
    resolved.warnings.filter((warning) => warning.field === 'secondaryButton')
  /** What the pressed state paints behind the text: `currentColor` at 26% over the background. */
  const pressed = (background: string, ink: string, alpha = 0.26) => {
    const mix = (a: number, b: number) => Math.round(a + (b - a) * alpha)
    const [r, g, b] = [1, 3, 5].map((at) =>
      mix(
        Number.parseInt(background.slice(at, at + 2), 16),
        Number.parseInt(ink.slice(at, at + 2), 16),
      ),
    )
    return `#${[r, g, b].map((channel) => (channel ?? 0).toString(16).padStart(2, '0')).join('')}`
  }

  it('reproduces the audit’s pair: #767676 on white is 4.54:1 before Soft fill and under 4.5:1 with it', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#767676', pressed('#ffffff', '#767676'))).toBeLessThan(4.5)
    // Even the resting 10% tint takes it to about 4.0:1.
    expect(contrastRatio('#767676', pressed('#ffffff', '#767676', 0.1))).toBeCloseTo(4.02, 1)
    const resolved = resolveDesignTokens({ ...SOFT, ink: '#767676', surface: '#ffffff' })
    expect(secondaryVars(resolved.vars)).toEqual([])
    expect(resolved.errors).toEqual([])
    const [warning] = softWarnings(resolved)
    expect(warning?.message).toContain('Text on the background from 4.5:1 to')
    expect(warning?.message).toContain('secondary buttons stay Outline')
  })

  it('does the same on the Alternate background', () => {
    const colours = { ink: '#6b6b6b', surface: '#ffffff', surfaceAlt: '#f3f3f3' }
    expect(contrastRatio(colours.ink, colours.surfaceAlt)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colours.ink, pressed(colours.surfaceAlt, colours.ink))).toBeLessThan(4.5)
    const resolved = resolveDesignTokens({ ...SOFT, ...colours })
    expect(secondaryVars(resolved.vars)).toEqual([])
    expect(softWarnings(resolved)[0]?.message).toContain('Text on the alternate background')
  })

  it('does the same for Inverse text on the Inverse background', () => {
    // Inverse text is derived from the background, so a mid-tone Inverse background is the close case.
    const resolved = resolveDesignTokens({ ...SOFT, surfaceInverse: '#767676' })
    const { inkInverse, surfaceInverse } = resolved.colours
    expect(contrastRatio(inkInverse, surfaceInverse)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(inkInverse, pressed(surfaceInverse, inkInverse))).toBeLessThan(4.5)
    expect(secondaryVars(resolved.vars)).toEqual([])
    expect(softWarnings(resolved)[0]?.message).toContain('Inverse text on the inverse background')
  })

  it('keeps Soft fill when every tone still reads, even close to the threshold', () => {
    // #595959 on white: 7:1 before, about 4.7:1 at the strongest tint.
    const near = { ink: '#595959', surface: '#ffffff', surfaceAlt: '#ffffff' }
    expect(contrastRatio(near.ink, pressed(near.surface, near.ink))).toBeGreaterThanOrEqual(4.5)
    const resolved = resolveDesignTokens({ ...SOFT, ...near })
    expect(secondaryVars(resolved.vars).sort()).toEqual([
      '--button-secondary-fill',
      '--button-secondary-fill-active',
      '--button-secondary-fill-hover',
      '--button-secondary-ring',
    ])
    expect(softWarnings(resolved)).toEqual([])
  })

  it('keeps Soft fill on the default colours, a Primary and the dark appearance', () => {
    for (const extra of [{}, { primary: '#0b6e4f' }, { appearance: 'dark' }]) {
      const resolved = resolveDesignTokens({ ...SOFT, ...extra })
      expect(secondaryVars(resolved.vars)).toHaveLength(4)
      expect(softWarnings(resolved)).toEqual([])
    }
  })

  it('changes nothing for Outline or an unset choice, whatever the colours', () => {
    for (const secondaryButton of ['outline', undefined]) {
      const resolved = resolveDesignTokens({ secondaryButton, ink: '#767676', surface: '#ffffff' })
      expect(secondaryVars(resolved.vars)).toEqual([])
      expect(softWarnings(resolved)).toEqual([])
    }
  })

  it('leaves the other button variables alone when it falls back', () => {
    const resolved = resolveDesignTokens({
      ...SOFT,
      buttonDepth: 'raised',
      buttonGlow: 'soft',
      ink: '#767676',
      surface: '#ffffff',
    })
    expect(resolved.vars['--button-depth']).toBe('var(--shadow-raised)')
    expect(resolved.vars['--button-shadow']).toContain('var(--shadow-raised)')
    expect(secondaryVars(resolved.vars)).toEqual([])
  })
})
