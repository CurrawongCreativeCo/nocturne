import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'
import tokens from '@/styles/tokens.json'

import {
  HEADING_STYLES,
  HEADING_STYLE_NAMES,
  SCALED_ROLES,
  TODAY,
  headingStyleOf,
  headingStyleVariables,
} from './heading-styles'
import { SITE_DECISIONS, siteDecisionVars } from './site-decisions'

describe('heading styles (task 216b, provisional values)', () => {
  it('registers every named style, Standard first', () => {
    expect(Object.keys(SITE_DECISIONS.headingStyle.choices)).toEqual([...HEADING_STYLE_NAMES])
  })

  it('emits nothing for Standard, unset and an unknown choice', () => {
    expect(siteDecisionVars({ headingStyle: 'standard' })).toEqual({})
    expect(siteDecisionVars({ headingStyle: null })).toEqual({})
    expect(siteDecisionVars({ headingStyle: 'unheard-of' })).toEqual({})
    expect(headingStyleOf(undefined)).toBe(TODAY)
    expect(headingStyleOf('standard')).toBe(TODAY)
  })

  it('TODAY is what tokens.json draws: semibold, the tokens’ tracking, no resizing', () => {
    expect(TODAY.weight).toBe(600)
    for (const role of SCALED_ROLES) {
      expect(tokens.type[role].letterSpacing).toBe(TODAY.tracking)
      expect(TODAY.scale[role]).toBe(1)
    }
  })

  it('maps Editorial: weight 500, -0.04em, display, h1 and h2 at 110%, h3 at 105%', () => {
    expect(siteDecisionVars({ headingStyle: 'editorial' })).toEqual({
      '--heading-weight': '500',
      '--text-display--letter-spacing': '-0.04em',
      '--text-display': `calc(${tokens.type.display.size} * 1.1)`,
      '--text-h1--letter-spacing': '-0.04em',
      '--text-h1': `calc(${tokens.type.h1.size} * 1.1)`,
      '--text-h2--letter-spacing': '-0.04em',
      '--text-h2': `calc(${tokens.type.h2.size} * 1.1)`,
      '--text-h3--letter-spacing': '-0.04em',
      '--text-h3': `calc(${tokens.type.h3.size} * 1.05)`,
    })
  })

  it('maps Modern: weight 700 and -0.03em, with no size changes', () => {
    expect(siteDecisionVars({ headingStyle: 'modern' })).toEqual({
      '--heading-weight': '700',
      '--text-display--letter-spacing': '-0.03em',
      '--text-h1--letter-spacing': '-0.03em',
      '--text-h2--letter-spacing': '-0.03em',
      '--text-h3--letter-spacing': '-0.03em',
    })
  })

  it('maps Classic: weight 600, -0.01em, display, h1 and h2 at 95%, h3 unchanged', () => {
    const vars = siteDecisionVars({ headingStyle: 'classic' })
    expect(vars['--heading-weight']).toBe('600')
    expect(vars['--text-h2--letter-spacing']).toBe('-0.01em')
    expect(vars['--text-h2']).toBe(`calc(${tokens.type.h2.size} * 0.95)`)
    expect(vars['--text-display']).toBe(`calc(${tokens.type.display.size} * 0.95)`)
    expect(vars).not.toHaveProperty('--text-h3')
  })

  it('only sets variables the site already defines, plus --heading-weight; fonts and h4 stay', () => {
    const defined = readFileSync('src/styles/tokens.generated.css', 'utf8')
    for (const style of Object.values(HEADING_STYLES)) {
      for (const name of Object.keys(headingStyleVariables(style))) {
        if (name === '--heading-weight') continue
        expect(defined, name).toContain(`${name}:`)
        expect(name).not.toMatch(/font|h4|body|lead|small/)
      }
    }
  })

  it('keeps Editorial, Modern and Classic distinct from each other and from today', () => {
    const looks = HEADING_STYLE_NAMES.map((name) =>
      JSON.stringify(siteDecisionVars({ headingStyle: name })),
    )
    expect(new Set(looks).size).toBe(HEADING_STYLE_NAMES.length)
  })

  it('goes through resolveDesignTokens with nothing else changed, and nothing when unset', () => {
    expect(resolveDesignTokens({ headingStyle: 'standard' }).css).toBe('')
    expect(resolveDesignTokens({ headingStyle: null })).toEqual(resolveDesignTokens({}))
    const colourOnly = resolveDesignTokens({ primary: '#0b6e4f' })
    const styled = resolveDesignTokens({ primary: '#0b6e4f', headingStyle: 'editorial' })
    expect(styled.vars['--heading-weight']).toBe('500')
    expect(styled.colours).toEqual(colourOnly.colours)
    expect(styled.vars['--color-accent']).toBe(colourOnly.vars['--color-accent'])
  })

  it('reads --heading-weight in one rule for h1, h2 and h3 that falls back to each heading’s own weight', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8')
    const rule =
      /(^|\n)((?:h\d,\s*)*h\d)\s*\{\s*font-weight:\s*var\(--heading-weight,\s*revert-layer\);\s*\}/.exec(
        css,
      )
    expect(rule).not.toBeNull()
    // The same levels the styles resize, and not h4, which keeps its own weight and spacing.
    expect(rule?.[2]?.split(',').map((selector) => selector.trim())).toEqual(['h1', 'h2', 'h3'])
    // Outside every layer, so it beats the components' own weights only when the variable is set.
    expect(css.lastIndexOf('revert-layer')).toBeGreaterThan(css.lastIndexOf('@layer'))
  })

  it('never reads --heading-weight anywhere else, so nothing else follows a style', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8')
    expect(css.match(/var\(--heading-weight/g)).toHaveLength(1)
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/\bh4\b[^{}]*\{[^{}]*--heading-weight/)
  })

  it('leaves unset exactly as today: no weight and no h4 variable in any style', () => {
    expect(siteDecisionVars({ headingStyle: 'standard' })).not.toHaveProperty('--heading-weight')
    expect(siteDecisionVars({ headingStyle: 'modern' })).toHaveProperty('--heading-weight', '700')
    for (const style of HEADING_STYLE_NAMES) {
      for (const name of Object.keys(siteDecisionVars({ headingStyle: style }))) {
        expect(name).not.toMatch(/h4/)
      }
    }
  })
})
