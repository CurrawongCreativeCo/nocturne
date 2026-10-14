import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/color/contrast'

import { currawongBrand, currawongPalette } from './currawong'
import { resolveStudioBrand } from './resolve'
import { CONTRAST_RULES, ROLE_NAMES, type StudioBrandFile } from './types'

const resolve = (client: StudioBrandFile, studioTitle?: string) =>
  resolveStudioBrand(client, currawongBrand, { studioTitle })

/** Every colour that belongs to Currawong: its palette plus each role value it defines. */
const currawongColours = new Set<string>([
  ...Object.values(currawongPalette),
  ...ROLE_NAMES.flatMap((role) => [currawongBrand.light[role], currawongBrand.dark[role]]),
])

const CLIENT_LOGO = 'src/assets/brand/client/logo.svg'
const CLIENT_DARK_LOGO = 'src/assets/brand/client/logo-dark.svg'

describe('resolveStudioBrand: precedence matrix', () => {
  it('an empty file is Currawong, exactly', () => {
    const brand = resolve({})
    expect(brand).toEqual({
      source: 'currawong',
      name: 'Currawong Creative',
      logo: currawongBrand.logo,
      mark: currawongBrand.mark,
      logoSource: 'currawong',
      logoDrawnFor: null,
      light: currawongBrand.light,
      dark: currawongBrand.dark,
      warnings: [],
    })
  })

  it('a name only: the client name, with Currawong colours and logo', () => {
    const brand = resolve({ name: 'Acme Plumbing' })
    expect(brand.source).toBe('client')
    expect(brand.name).toBe('Acme Plumbing')
    expect(brand.light).toEqual(currawongBrand.light)
    expect(brand.dark).toEqual(currawongBrand.dark)
    expect(brand.logo).toEqual(currawongBrand.logo)
  })

  it('name text falls back to NEXT_PUBLIC_STUDIO_TITLE, then to Currawong Creative', () => {
    expect(resolve({}, 'Acme CMS').name).toBe('Acme CMS')
    expect(resolve({ name: 'Acme Plumbing' }, 'Acme CMS').name).toBe('Acme Plumbing')
    expect(resolve({}, '   ').name).toBe('Currawong Creative')
    expect(resolve({}, undefined).name).toBe('Currawong Creative')
  })

  it('a logo only: the client logo, with Currawong colours', () => {
    const brand = resolve({ logo: { onLight: CLIENT_LOGO, onDark: CLIENT_DARK_LOGO } })
    expect(brand.source).toBe('client')
    expect(brand.logo.light).toEqual({ kind: 'image', src: CLIENT_LOGO })
    expect(brand.logo.dark).toEqual({ kind: 'image', src: CLIENT_DARK_LOGO })
    expect(brand.light).toEqual(currawongBrand.light)
    expect(brand.name).toBe('Currawong Creative')
  })

  it('a single logo file serves both schemes; the mark falls back to the client logo, not Currawong', () => {
    const brand = resolve({ logo: { onDark: CLIENT_DARK_LOGO } })
    expect(brand.logo.light).toEqual({ kind: 'image', src: CLIENT_DARK_LOGO })
    expect(brand.logo.dark).toEqual({ kind: 'image', src: CLIENT_DARK_LOGO })
    expect(brand.mark.light).toEqual({ kind: 'image', src: CLIENT_DARK_LOGO })
  })

  it('records where the logo came from and which scheme a lone file was drawn for', () => {
    expect(resolve({})).toMatchObject({ logoSource: 'currawong', logoDrawnFor: null })
    expect(resolve({ colors: { primary: '#1a73e8' } })).toMatchObject({
      logoSource: 'monogram',
      logoDrawnFor: null,
    })
    expect(resolve({ logo: { onLight: CLIENT_LOGO, onDark: CLIENT_DARK_LOGO } })).toMatchObject({
      logoSource: 'client',
      logoDrawnFor: null,
    })
    expect(resolve({ logo: { onLight: CLIENT_LOGO } }).logoDrawnFor).toBe('light')
    expect(resolve({ logo: { onDark: CLIENT_DARK_LOGO } }).logoDrawnFor).toBe('dark')
    // A mark alone is not a logo.
    expect(resolve({ logo: { mark: 'src/assets/brand/client/mark.svg' } }).logoSource).toBe(
      'currawong',
    )
  })

  it('a client mark is used for both schemes', () => {
    const mark = 'src/assets/brand/client/mark.svg'
    const brand = resolve({ logo: { onLight: CLIENT_LOGO, mark } })
    expect(brand.mark).toEqual({
      light: { kind: 'image', src: mark },
      dark: { kind: 'image', src: mark },
    })
  })

  it('colours without a logo: a monogram of the client name in the primary colour', () => {
    const brand = resolve({ name: 'acme plumbing', colors: { primary: '#1A73E8' } })
    expect(brand.logo.light).toMatchObject({ kind: 'monogram', text: 'A', background: '#1a73e8' })
    expect(brand.logo.dark).toMatchObject({ kind: 'monogram', text: 'A', background: '#1a73e8' })
    expect(brand.mark.light).toMatchObject({ kind: 'monogram', text: 'A' })
    for (const scheme of ['light', 'dark'] as const) {
      const asset = brand.logo[scheme]
      if (asset.kind !== 'monogram') throw new Error('expected a monogram')
      expect(contrastRatio(asset.foreground, asset.background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('a monogram uses the resolved name when the file has no name', () => {
    expect(resolve({ colors: { primary: '#1a73e8' } }, 'Zed CMS').logo.light).toMatchObject({
      text: 'Z',
    })
  })

  it('a client logo beats the monogram', () => {
    const brand = resolve({ logo: { onLight: CLIENT_LOGO }, colors: { primary: '#1a73e8' } })
    expect(brand.logo.light).toEqual({ kind: 'image', src: CLIENT_LOGO })
  })

  it('primary only: the whole palette is derived from it, secondary included', () => {
    const brand = resolve({ colors: { primary: '#1a73e8' } })
    expect(brand.source).toBe('client')
    expect(brand.light.accentFill).toBe('#1a73e8')
    expect(brand.dark.accentFill).toBe('#1a73e8')
    expect(brand.light.highlightFill).not.toBe(brand.light.accentFill)
    expect(brand.light.highlightFill).toBe(brand.dark.highlightFill)
  })

  it('primary plus secondary: both are kept exactly on fills', () => {
    const brand = resolve({ colors: { primary: '#1A73E8', secondary: '#E8A317' } })
    expect(brand.light.accentFill).toBe('#1a73e8')
    expect(brand.light.highlightFill).toBe('#e8a317')
    expect(brand.dark.highlightFill).toBe('#e8a317')
  })

  it('a lone secondary stands in for the primary instead of reverting to Currawong', () => {
    const brand = resolve({ colors: { secondary: '#e8a317' } })
    expect(brand.light.highlightFill).toBe('#e8a317')
    expect(brand.light.accentFill).not.toBe(currawongPalette.violet)
    expect(brand.light.accentFill).not.toBe('#e8a317')
  })

  it('a low-contrast primary (#FFD400) is lifted on light for text and focus, with warnings, and kept on fills', () => {
    const brand = resolve({ colors: { primary: '#FFD400' } })
    expect(brand.light.accentFill).toBe('#ffd400')
    expect(contrastRatio(brand.light.accentText, brand.light.background)).toBeGreaterThanOrEqual(
      4.5,
    )
    expect(contrastRatio(brand.light.focus, brand.light.background)).toBeGreaterThanOrEqual(3)
    expect(brand.light.accentText).not.toBe('#ffd400')
    // Yellow already reads on dark, so only light mode needs lifting.
    expect(brand.dark.accentText).toBe('#ffd400')
    const lightWarnings = brand.warnings.filter(
      (warning) => warning.scheme === 'light' && warning.colour === 'primary',
    )
    expect(lightWarnings.map((warning) => warning.role).sort()).toEqual(['accentText', 'focus'])
    expect(lightWarnings[0]?.from).toBe('#ffd400')
    expect(lightWarnings[0]?.message).toContain('#ffd400')
    expect(
      brand.warnings.some((warning) => warning.scheme === 'dark' && warning.colour === 'primary'),
    ).toBe(false)
  })

  it('a very dark primary is lifted in dark mode, with warnings, and kept on fills', () => {
    const brand = resolve({ colors: { primary: '#0a0a3c' } })
    expect(brand.dark.accentFill).toBe('#0a0a3c')
    expect(brand.dark.accentText).not.toBe('#0a0a3c')
    expect(contrastRatio(brand.dark.accentText, brand.dark.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(brand.dark.focus, brand.dark.background)).toBeGreaterThanOrEqual(3)
    expect(brand.light.accentText).toBe('#0a0a3c')
    const darkWarnings = brand.warnings.filter(
      (warning) => warning.scheme === 'dark' && warning.colour === 'primary',
    )
    expect(darkWarnings.map((warning) => warning.role).sort()).toEqual(['accentText', 'focus'])
    for (const warning of darkWarnings) expect(warning.to).not.toBe(warning.from)
  })

  it('a colour that needs no adjusting records no warning', () => {
    const brand = resolve({ colors: { primary: '#1a4fa0', secondary: '#7a3d00' } })
    expect(brand.warnings.filter((warning) => warning.scheme === 'light')).toEqual([])
  })
})

describe('resolveStudioBrand: rules that hold for every input', () => {
  const clients: Record<string, StudioBrandFile> = {
    'primary only': { colors: { primary: '#1a73e8' } },
    'primary and secondary': { colors: { primary: '#1a73e8', secondary: '#e8a317' } },
    'low-contrast primary': { colors: { primary: '#ffd400' } },
    'very dark primary': { colors: { primary: '#0a0a3c' } },
    'grey primary': { colors: { primary: '#808080' } },
    'black primary': { colors: { primary: '#000000' } },
    'white primary': { colors: { primary: '#ffffff', secondary: '#ffffff' } },
    'secondary only': { colors: { secondary: '#e8a317' } },
    everything: {
      name: 'Acme',
      logo: { onLight: CLIENT_LOGO },
      colors: { primary: '#1a73e8', secondary: '#e8a317' },
    },
  }

  for (const [label, client] of Object.entries(clients)) {
    describe(label, () => {
      const brand = resolve(client)

      it('uses no Currawong colour anywhere in the resolved set', () => {
        const used = new Set<string>()
        for (const scheme of [brand.light, brand.dark])
          for (const hex of Object.values(scheme)) used.add(hex)
        for (const variants of [brand.logo, brand.mark]) {
          for (const asset of [variants.light, variants.dark]) {
            if (asset.kind === 'monogram') {
              used.add(asset.background)
              used.add(asset.foreground)
            }
          }
        }
        for (const hex of used) {
          // Pure black and white are the last-resort text colours, shared with any palette.
          if (hex === '#ffffff') continue
          expect(currawongColours.has(hex), `${hex} is a Currawong colour`).toBe(false)
        }
      })

      it('meets every contrast rule in both schemes', () => {
        for (const scheme of [brand.light, brand.dark]) {
          for (const rule of CONTRAST_RULES) {
            expect(
              contrastRatio(scheme[rule.foreground], scheme[rule.background]),
              `${rule.foreground} on ${rule.background}`,
            ).toBeGreaterThanOrEqual(rule.min - 0.01)
          }
        }
      })

      it('gives every role a lowercase hex', () => {
        for (const scheme of [brand.light, brand.dark]) {
          for (const role of ROLE_NAMES) expect(scheme[role]).toMatch(/^#[0-9a-f]{6}$/)
        }
      })
    })
  }

  it('never replaces a client value with a Currawong one', () => {
    const client: StudioBrandFile = {
      name: 'Acme',
      logo: {
        onLight: CLIENT_LOGO,
        onDark: CLIENT_DARK_LOGO,
        mark: 'src/assets/brand/client/mark.svg',
      },
      colors: { primary: '#1a73e8', secondary: '#e8a317' },
    }
    const brand = resolve(client, 'Some Title')
    expect(brand.name).toBe('Acme')
    expect(brand.logo.light).toEqual({ kind: 'image', src: CLIENT_LOGO })
    expect(brand.logo.dark).toEqual({ kind: 'image', src: CLIENT_DARK_LOGO })
    expect(brand.mark.light).toEqual({ kind: 'image', src: 'src/assets/brand/client/mark.svg' })
    expect(brand.light.accentFill).toBe('#1a73e8')
    expect(brand.light.highlightFill).toBe('#e8a317')
    expect(brand.dark.accentFill).toBe('#1a73e8')
    expect(brand.dark.highlightFill).toBe('#e8a317')
  })

  it('tints the neutrals toward the client hue but not by field: no Currawong neutral survives', () => {
    const blue = resolve({ colors: { primary: '#1a73e8' } })
    expect(blue.light.background).not.toBe(currawongPalette.paper)
    expect(blue.dark.background).not.toBe(currawongPalette.ink)
    expect(blue.light.surface).not.toBe(currawongPalette.lilac)
  })

  it('does not depend on tokens.json: the same input gives the same palette', () => {
    expect(resolve({ colors: { primary: '#1a73e8' } })).toEqual(
      resolve({ colors: { primary: '#1a73e8' } }),
    )
  })
})
