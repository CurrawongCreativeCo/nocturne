import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { contrastRatio } from './contrast'
import { suggestColour, suggestColourForAll } from './contrast-remedy'
import { hexToOklch } from './oklch'
import { resolveDesignTokens, TEXT_RATIO, type DesignOverrides } from './resolve-design-tokens'

/**
 * The Brand colours contrast policy (task 216): a pair the editor chose in full under Advanced and
 * that fails text contrast is an error on this document; everything inherited or derived is a warning
 * and the site adjusts derived text itself; page and section documents never get contrast errors.
 */

const at = (vars: Record<string, string>, name: string) => vars[name] ?? ''

/** The angle between two colours' OKLCH hues, going the short way round. */
const hueDrift = (a: string, b: string) => {
  const drift = Math.abs(hexToOklch(a).h - hexToOklch(b).h)
  return Math.min(drift, 360 - drift)
}

describe('an explicitly chosen Advanced pair that fails', () => {
  it('is an error on the text colour, which is never changed', () => {
    const result = resolveDesignTokens({ surface: '#ffffff', ink: '#bbbbbb' })
    expect(result.errors.map((item) => item.field)).toEqual(['ink'])
    expect(result.errors[0]?.message).toContain('Text on the background')
    expect(result.errors[0]?.message).toContain('4.5:1')
    expect(result.warnings.map((item) => item.field)).not.toContain('ink')
    expect(at(result.vars, '--color-ink')).toBe('#bbbbbb')
  })

  it('is marked explicit and adjustable, which is what offers Use suggested colour', () => {
    const { checks } = resolveDesignTokens({ surface: '#ffffff', ink: '#bbbbbb' })
    expect(checks.find((item) => item.id === 'ink-surface')).toMatchObject({
      pass: false,
      explicit: true,
      adjustable: true,
    })
    const inherited = resolveDesignTokens({ ink: '#bbbbbb' }).checks
    expect(inherited.find((item) => item.id === 'ink-surface')?.explicit).toBe(false)
  })

  it('covers Muted text on the Background and on the Alternate background', () => {
    const onSurface = resolveDesignTokens({ surface: '#ffffff', inkMuted: '#cccccc' })
    expect(onSurface.errors.map((item) => item.field)).toEqual(['inkMuted'])
    const onAlt = resolveDesignTokens({ surfaceAlt: '#f0f0f0', inkMuted: '#bbbbbb' })
    expect(onAlt.errors.map((item) => [item.field, item.message])).toEqual([
      ['inkMuted', expect.stringContaining('Muted text on the alternate background')],
    ])
  })

  it('is a valid pair once the suggested colour is used', () => {
    const cases: [string, string][] = [
      ['#ffffff', '#bbbbbb'],
      ['#fff7e0', '#c9b99a'],
      ['#111827', '#3a4660'],
      ['#7a7a7a', '#808080'],
    ]
    for (const [surface, ink] of cases) {
      const failing = resolveDesignTokens({ surface, ink })
      expect(failing.errors.length, `${ink} on ${surface}`).toBeGreaterThan(0)
      const check = failing.checks.find((item) => item.id === 'ink-surface')
      const suggestion = suggestColour(ink, surface, check?.required ?? TEXT_RATIO)
      expect(suggestion, `a shade of ${ink} for ${surface}`).not.toBeNull()
      const fixed = resolveDesignTokens({ surface, ink: suggestion?.hex })
      expect(fixed.errors).toEqual([])
      expect(contrastRatio(suggestion?.hex ?? '', surface)).toBeGreaterThanOrEqual(TEXT_RATIO)
      // The suggestion keeps the colour's hue (a grey has none to keep).
      if (hexToOklch(ink).c > 0.03) {
        expect(hueDrift(suggestion?.hex ?? '', ink), `${ink} -> ${suggestion?.hex}`).toBeLessThan(6)
      }
    }
  })

  it('is no error when the pair passes, and none for text the editor did not choose', () => {
    expect(resolveDesignTokens({ surface: '#ffffff', ink: '#222222' }).errors).toEqual([])
    expect(resolveDesignTokens({ surface: '#ffffff', inkMuted: '#555555' }).errors).toEqual([])
  })
})

describe('Text on the Alternate background (Tinted sections and cards)', () => {
  const pairs = (input: DesignOverrides) => resolveDesignTokens(input).checks.map((item) => item.id)

  it('is checked whenever Text or a background is chosen, and not for a site with nothing set', () => {
    expect(pairs({ ink: '#222222' })).toContain('ink-alt')
    expect(pairs({ surfaceAlt: '#eeeeee' })).toContain('ink-alt')
    expect(pairs({ surface: '#ffffff' })).toContain('ink-alt')
    expect(pairs({})).not.toContain('ink-alt')
  })

  it('is an error when Text and the Alternate background were both chosen and fail', () => {
    const result = resolveDesignTokens({
      surface: '#ffffff',
      surfaceAlt: '#999999',
      ink: '#6b6b6b',
    })
    expect(result.checks.find((item) => item.id === 'ink-surface')?.pass).toBe(true)
    expect(result.checks.find((item) => item.id === 'ink-alt')).toMatchObject({
      pass: false,
      explicit: true,
      adjustable: true,
    })
    expect(result.errors.map((item) => item.field)).toEqual(['ink'])
    expect(result.errors[0]?.message).toContain('Text on the alternate background')
    expect(at(result.vars, '--color-ink')).toBe('#6b6b6b')
  })

  it('is only a warning when the Alternate background was not chosen', () => {
    const result = resolveDesignTokens({ surface: '#ffffff', ink: '#999999' })
    expect(result.errors.map((item) => item.field)).toEqual(['ink'])
    // Chosen Text on a derived tint that fails but whose Background passes: warning only.
    const tint = resolveDesignTokens({ ink: '#6b6b6b', surface: '#808080' })
    expect(tint.checks.find((item) => item.id === 'ink-alt')?.explicit).toBe(false)
    expect(tint.errors.filter((item) => item.message.includes('alternate'))).toEqual([])
  })

  it('does not warn about a field that already has an error: one suggestion covers every pair', () => {
    const result = resolveDesignTokens({ surface: '#ffffff', ink: '#bbbbbb' })
    expect(result.errors.map((item) => item.field)).toEqual(['ink'])
    expect(result.warnings.map((item) => item.field)).not.toContain('ink')
  })

  it('offers one suggestion that clears every pair the colour sits in, never just the first', () => {
    const surface = '#ffffff'
    const surfaceAlt = '#c8c8c8'
    const ink = '#6b6b6b'
    const failing = resolveDesignTokens({ surface, surfaceAlt, ink })
    // Passes the Background, fails the Alternate background: the old first-failing suggestion only
    // looked at the pair that failed, which here is the Alternate background.
    const suggestion = suggestColourForAll(ink, [surface, surfaceAlt], TEXT_RATIO)
    expect(suggestion).not.toBeNull()
    expect(contrastRatio(suggestion?.hex ?? '', surface)).toBeGreaterThanOrEqual(TEXT_RATIO)
    expect(contrastRatio(suggestion?.hex ?? '', surfaceAlt)).toBeGreaterThanOrEqual(TEXT_RATIO)
    expect(suggestion?.ratio).toBeGreaterThanOrEqual(TEXT_RATIO)
    expect(failing.errors.length).toBeGreaterThan(0)
    const fixed = resolveDesignTokens({ surface, surfaceAlt, ink: suggestion?.hex })
    expect(fixed.errors).toEqual([])
    expect(
      fixed.checks.filter((item) => item.fields.includes('ink')).every((item) => item.pass),
    ).toBe(true)
  })

  it('does the same for Muted text on both backgrounds', () => {
    const surface = '#ffffff'
    const surfaceAlt = '#bbbbbb'
    const suggestion = suggestColourForAll('#999999', [surface, surfaceAlt], TEXT_RATIO)
    expect(suggestion).not.toBeNull()
    const fixed = resolveDesignTokens({ surface, surfaceAlt, inkMuted: suggestion?.hex })
    expect(fixed.errors).toEqual([])
  })

  it('makes no claim when no shade passes every background, and the error stays', () => {
    // Black on #707070 is 4.2:1 and white on #808080 is 3.9:1, so no ink can clear both.
    const surface = '#808080'
    const surfaceAlt = '#707070'
    expect(suggestColourForAll('#888888', [surface, surfaceAlt], TEXT_RATIO)).toBeNull()
    expect(suggestColourForAll('#000000', [surface, surfaceAlt], TEXT_RATIO)).toBeNull()
    expect(
      resolveDesignTokens({ surface, surfaceAlt, ink: '#888888' }).errors.length,
    ).toBeGreaterThan(0)
  })

  it('suggests nothing for a colour that already passes every background', () => {
    expect(suggestColourForAll('#222222', ['#ffffff', '#eeeeee'], TEXT_RATIO)).toBeNull()
    expect(suggestColourForAll('#222222', [], TEXT_RATIO)).toBeNull()
  })

  it('leaves unset and derived sites with no failing pair', () => {
    for (const input of [
      {},
      { appearance: 'dark' },
      { surface: '#101010' },
      { surface: '#fafafa' },
    ]) {
      const result = resolveDesignTokens(input)
      expect(result.errors).toEqual([])
      expect(result.checks.filter((item) => !item.pass)).toEqual([])
    }
  })
})

describe('an inherited or derived pair', () => {
  const cases: [string, DesignOverrides][] = [
    ['a chosen Text on the default Background', { ink: '#bbbbbb' }],
    ['a chosen Muted text on the default Background', { inkMuted: '#cccccc' }],
    ['a chosen Background with derived text', { surface: '#7a7a7a' }],
    ['a dark chosen Background with derived text', { surface: '#101010' }],
    ['a chosen Inverse background with derived text', { surfaceInverse: '#fafafa' }],
    ['Appearance on its own', { appearance: 'dark' }],
    ['Primary on its own', { primary: '#ffd166' }],
    ['a failing Text with no chosen Background, in dark', { appearance: 'dark', ink: '#222222' }],
  ]

  it.each(cases)('%s is never an error', (_name, input) => {
    expect(resolveDesignTokens(input).errors).toEqual([])
  })

  it('stays a warning when the editor chose the text but not the background', () => {
    const result = resolveDesignTokens({ ink: '#bbbbbb' })
    expect(result.warnings.map((item) => item.field)).toContain('ink')
    expect(at(result.vars, '--color-ink')).toBe('#bbbbbb')
  })

  it('derives text from near-black or white that reads on the chosen background', () => {
    for (const surface of ['#7a7a7a', '#101010', '#fafafa', '#3b4cca']) {
      const { vars } = resolveDesignTokens({ surface })
      const ink = at(vars, '--color-ink') || '#030712'
      expect(contrastRatio(ink, surface), surface).toBeGreaterThanOrEqual(TEXT_RATIO)
    }
  })
})

describe('brand-coloured text (links and eyebrows)', () => {
  const surfaces: (string | undefined)[] = [undefined, '#fff7e0', '#1b1b2f', '#e8f0ff']
  const primaries = ['#ffd166', '#f4a261', '#7ad9b4', '#3266e4', '#0b6e4f', '#d62839', '#e9ecef']

  it('reaches 4.5:1 on the Background and the Alternate background, whatever Primary is', () => {
    for (const primary of primaries) {
      for (const surface of surfaces) {
        for (const appearance of [undefined, 'dark']) {
          const { colours } = resolveDesignTokens({ primary, surface, appearance })
          const label = `${primary} on ${surface ?? 'default'} ${appearance ?? 'light'}`
          expect(contrastRatio(colours.accentText, colours.surface), label).toBeGreaterThanOrEqual(
            TEXT_RATIO,
          )
          expect(
            contrastRatio(colours.accentText, colours.surfaceAlt),
            label,
          ).toBeGreaterThanOrEqual(TEXT_RATIO)
        }
      }
    }
  })

  it('keeps the hue of Primary, and leaves buttons and backgrounds exactly as chosen', () => {
    for (const primary of primaries.filter((hex) => hexToOklch(hex).c > 0.05)) {
      const { colours, vars } = resolveDesignTokens({ primary })
      expect(hueDrift(colours.accentText, primary), primary).toBeLessThan(6)
      // A Primary equal to tokens.json's emits no variable; the resolved colours say what is drawn.
      expect(colours.accent).toBe(primary)
      expect(colours.cta).toBe(primary)
      expect(vars['--color-accent'] ?? primary).toBe(primary)
    }
  })

  it('says what it did, with the shade, in a warning (not an error), and offers the accessible shade', () => {
    const result = resolveDesignTokens({ primary: '#ffd166' })
    const warning = result.warnings.find((item) => item.field === 'primary')
    expect(warning?.message).toContain(result.colours.accentText)
    expect(warning?.message).toContain('buttons and backgrounds keep your colour')
    expect(result.errors).toEqual([])
    // "Use suggested colour" saves that accessible shade as Primary, after which nothing is adjusted.
    const check = result.checks.find((item) => item.id === 'primary-text')
    const suggestion = suggestColour('#ffd166', check?.background ?? '', check?.required ?? 0)
    expect(suggestion).not.toBeNull()
    const accepted = resolveDesignTokens({ primary: suggestion?.hex })
    expect(accepted.warnings.find((item) => item.field === 'primary')).toBeUndefined()
    expect(at(accepted.vars, '--color-accent-text')).toBe(suggestion?.hex)
  })
})

describe('unset rendering', () => {
  it('is empty, with no errors and no warnings', () => {
    for (const input of [
      undefined,
      null,
      {},
      { primary: null, ink: '', surface: 'not a colour' },
    ]) {
      const result = resolveDesignTokens(input)
      expect(result.css).toBe('')
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    }
  })

  it('is unchanged by the site decisions (density, shape, heading style)', () => {
    const result = resolveDesignTokens({ density: 'airy', shape: 'round', headingStyle: 'modern' })
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.checks).toEqual([])
  })
})

describe('page and section documents', () => {
  const read = (file: string) => readFileSync(file, 'utf8')
  const sources = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
      const full = path.join(directory, name)
      if (statSync(full).isDirectory()) return sources(full)
      return /\.(ts|tsx)$/.test(name) && !name.includes('.test.') ? [full] : []
    })
  const schemaFiles = [
    ...sources('src/lib/sanity/schema'),
    ...sources('src/features').filter((file) => file.includes(`${path.sep}schemas${path.sep}`)),
  ].filter((file) => !file.endsWith(path.join('site', 'schemas', 'design-settings.ts')))

  it('never gain a contrast validation error: schemas that use the colour code only warn', () => {
    const usingColour = schemaFiles.filter((file) => read(file).includes("from '@/lib/color/"))
    expect(usingColour.length).toBeGreaterThan(5)
    for (const file of usingColour) {
      expect(read(file), file).not.toMatch(/\.error\(\)/)
    }
  })

  it('read the resolver’s errors only on Brand colours', () => {
    const readers = [...sources('src')].filter((file) => {
      const code = read(file)
      return (
        code.includes('resolveDesignTokens(') &&
        /\)\.errors\b|\berrors\b.*resolveDesignTokens/.test(code)
      )
    })
    expect(readers.map((file) => file.replaceAll(path.sep, '/'))).toEqual(
      expect.arrayContaining(['src/features/site/schemas/design-settings.ts']),
    )
    for (const file of readers) {
      expect(file.replaceAll(path.sep, '/')).toMatch(/design-settings\.ts$|\.test\.(ts|tsx)$/)
    }
  })
})
