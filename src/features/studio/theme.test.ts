import { describe, expect, it, vi } from 'vitest'

import { currawongBrand } from '@/config/studio-brand/currawong'
import { resolveStudioBrand } from '@/config/studio-brand/resolve'
import { contrastRatio } from '@/lib/color/contrast'
import { hexToRgb, rgbToHex, type Rgb } from '@/lib/color/oklch'

import { brandPreviewCases } from './brand-preview/cases'
import { buildStudioTheme, createStudioTheme, legacyThemeProperties } from './theme'

// The real 'sanity' is heavy and not needed: the adapter only hands properties to the builder.
vi.mock('sanity', () => ({
  buildLegacyTheme: (properties: unknown) => ({
    color: { light: { builtFrom: properties }, dark: { builtFrom: properties } },
  }),
}))

const client = resolveStudioBrand(
  { colors: { primary: '#1a73e8', secondary: '#e8a317' } },
  currawongBrand,
)

const channelwise = (a: Rgb, b: Rgb, fn: (x: number, y: number) => number): Rgb => [
  fn(a[0], b[0]),
  fn(a[1], b[1]),
  fn(a[2], b[2]),
]

/** Sanity's blend of a colour over a background, as in buildLegacyTheme: multiply in light, screen in dark. */
const blendOver = (scheme: 'light' | 'dark', background: string, colour: string) =>
  rgbToHex(
    channelwise(hexToRgb(background), hexToRgb(colour), (b, c) =>
      scheme === 'light' ? (b * c) / 255 : 255 - ((255 - b) * (255 - c)) / 255,
    ),
  )

/** The largest per-channel difference between two hex colours. */
const distance = (a: string, b: string) =>
  Math.max(...channelwise(hexToRgb(a), hexToRgb(b), (x, y) => Math.abs(x - y)))

describe('legacyThemeProperties', () => {
  const { light, dark } = currawongBrand
  const lightProps = legacyThemeProperties(light, 'light')
  const darkProps = legacyThemeProperties(dark, 'dark')

  it('maps a scheme to both the component and the navigation colours', () => {
    expect(lightProps['--component-bg']).toBe(light.background)
    expect(lightProps['--main-navigation-color']).toBe(light.background)
    expect(lightProps['--component-text-color']).toBe(light.text)
    expect(lightProps['--main-navigation-color--inverted']).toBe(light.text)
    expect(darkProps['--component-bg']).toBe('#101013')
    expect(darkProps['--main-navigation-color--inverted']).toBe('#f4efe6')
    expect(lightProps['--gray-base']).toBe(light.surfaceBorder)
    expect(darkProps['--gray-base']).toBe(dark.surfaceBorder)
  })

  it('uses ink for shadows and paper for the fallback text in dark mode, and the reverse in light', () => {
    expect(lightProps['--black']).toBe(light.text)
    expect(lightProps['--white']).toBe(light.background)
    expect(darkProps['--black']).toBe(dark.background)
    expect(darkProps['--white']).toBe(dark.text)
  })

  it('gives each scheme its own focus ring: no shared, lifted one', () => {
    expect(lightProps['--focus-color']).toBe('#5f2bd4')
    expect(darkProps['--focus-color']).toBe('#9f80e5')
  })

  it("renders the primary button as the scheme's accent fill after Sanity's blend", () => {
    const light600 = blendOver(
      'light',
      light.background,
      lightProps['--default-button-primary-color'],
    )
    const dark600 = blendOver('dark', dark.background, darkProps['--default-button-primary-color'])
    expect(distance(light600, '#5f2bd4')).toBeLessThanOrEqual(1)
    expect(distance(dark600, '#9f80e5')).toBeLessThanOrEqual(1)
  })

  it('keeps the neutral button warm: from the ink and paper range, not Sanity slate', () => {
    for (const [scheme, roles, props] of [
      ['light', light, lightProps],
      ['dark', dark, darkProps],
    ] as const) {
      const fill = blendOver(scheme, roles.background, props['--default-button-color'])
      const [r, , b] = hexToRgb(fill)
      expect(b - r).toBeLessThanOrEqual(0) // never bluer than it is red, as slate (#8691a3) is
    }
  })

  it("reaches 4.5:1 for the label Sanity prints on every brand's primary and neutral buttons", () => {
    for (const item of brandPreviewCases) {
      for (const scheme of ['light', 'dark'] as const) {
        const roles = item.brand[scheme]
        const props = legacyThemeProperties(roles, scheme)
        const label = blendOver(scheme, roles.background, roles.background)
        for (const key of ['--default-button-primary-color', '--default-button-color'] as const) {
          const fill = blendOver(scheme, roles.background, props[key])
          expect(contrastRatio(fill, label), `${item.id} ${scheme} ${key}`).toBeGreaterThanOrEqual(
            4.5,
          )
        }
      }
    }
  })

  it('makes the selection tint a clear tint of the accent, not a dusty mix', () => {
    // Selected background = background blended with 20% of --brand-primary over the background.
    const mixed = (scheme: 'light' | 'dark', roles: typeof light, props: typeof lightProps) => {
      const tint = rgbToHex(
        channelwise(
          hexToRgb(roles.background),
          hexToRgb(props['--brand-primary']),
          (b, m) => 0.2 * m + 0.8 * b,
        ),
      )
      return blendOver(scheme, roles.background, tint)
    }
    expect(mixed('light', light, lightProps)).toBe('#c0b3d4')
    expect(mixed('dark', dark, darkProps)).toBe('#423750')
  })

  it('sets only the colour properties it means to: no state colours and no fonts', () => {
    expect(Object.keys(lightProps).sort()).toEqual(
      [
        '--black',
        '--white',
        '--gray-base',
        '--brand-primary',
        '--default-button-color',
        '--default-button-primary-color',
        '--focus-color',
        '--main-navigation-color',
        '--main-navigation-color--inverted',
        '--component-bg',
        '--component-text-color',
      ].sort(),
    )
    for (const key of Object.keys(lightProps)) {
      expect(key).not.toMatch(/success|warning|danger|state|font/)
    }
  })

  it('follows a client brand instead of Currawong', () => {
    const mapped = legacyThemeProperties(client.dark, 'dark')
    expect(mapped['--component-bg']).toBe(client.dark.background)
    expect(legacyThemeProperties(client.light, 'light')['--component-bg']).toBe(
      client.light.background,
    )
    expect(Object.values(mapped)).not.toContain('#9f80e5')
  })

  it('gives every property a lowercase hex', () => {
    const values = [lightProps, darkProps].flatMap((props) => Object.values(props) as string[])
    for (const value of values) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('createStudioTheme', () => {
  it("builds once per scheme and takes each scheme's half", () => {
    const builder = vi.fn((props: unknown) => ({
      color: { light: { from: props }, dark: { from: props } },
    }))
    const theme = createStudioTheme(currawongBrand, builder) as unknown as {
      color: { light: { from: unknown }; dark: { from: unknown } }
    }
    expect(builder).toHaveBeenCalledTimes(2)
    expect(theme.color.light.from).toEqual(legacyThemeProperties(currawongBrand.light, 'light'))
    expect(theme.color.dark.from).toEqual(legacyThemeProperties(currawongBrand.dark, 'dark'))
  })

  it('drops the legacy markers, so Studio offers Appearance instead of pinning one scheme', () => {
    const builder = () => ({ __legacy: true, __dark: false, color: { light: {}, dark: {} } })
    const theme = createStudioTheme(currawongBrand, builder)
    expect(theme).not.toHaveProperty('__legacy')
    expect(theme).not.toHaveProperty('__dark')
    expect(theme).toHaveProperty('color.dark')
  })

  it('returns undefined, so Studio uses its default theme, when the builder is missing', () => {
    expect(createStudioTheme(currawongBrand, undefined)).toBeUndefined()
    expect(createStudioTheme(currawongBrand, { not: 'a function' })).toBeUndefined()
  })
})

describe('buildStudioTheme', () => {
  it("builds with sanity's buildLegacyTheme", () => {
    expect(buildStudioTheme(currawongBrand)).toEqual({
      color: {
        light: { builtFrom: legacyThemeProperties(currawongBrand.light, 'light') },
        dark: { builtFrom: legacyThemeProperties(currawongBrand.dark, 'dark') },
      },
    })
  })

  it('returns undefined when sanity no longer exports buildLegacyTheme', async () => {
    vi.resetModules()
    vi.doMock('sanity', () => ({ buildLegacyTheme: undefined }))
    const { buildStudioTheme: build } = await import('./theme')
    expect(build(currawongBrand)).toBeUndefined()
    vi.doUnmock('sanity')
  })
})
