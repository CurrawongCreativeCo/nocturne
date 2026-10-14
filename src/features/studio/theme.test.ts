import { describe, expect, it, vi } from 'vitest'

import { currawongBrand } from '@/config/studio-brand/currawong'
import { resolveStudioBrand } from '@/config/studio-brand/resolve'
import { contrastRatio } from '@/lib/color/contrast'

import { buildStudioTheme, createStudioTheme, legacyThemeProperties } from './theme'

// The real 'sanity' is heavy and not needed: the adapter only hands properties to the builder.
vi.mock('sanity', () => ({
  buildLegacyTheme: (properties: unknown) => ({ builtFrom: properties }),
}))

const client = resolveStudioBrand(
  { colors: { primary: '#1a73e8', secondary: '#e8a317' } },
  currawongBrand,
)

describe('legacyThemeProperties', () => {
  const { light, dark } = currawongBrand
  const properties = legacyThemeProperties(currawongBrand)

  it('maps the light roles to the component colours and the black and white', () => {
    expect(properties['--component-bg']).toBe(light.background)
    expect(properties['--component-text-color']).toBe(light.text)
    expect(properties['--white']).toBe(light.background)
    expect(properties['--black']).toBe(light.text)
    expect(properties['--gray-base']).toBe(light.surfaceBorder)
  })

  it('maps the dark roles to the main navigation colours: ink with paper text', () => {
    expect(properties['--main-navigation-color']).toBe('#101013')
    expect(properties['--main-navigation-color--inverted']).toBe('#f4efe6')
  })

  it('uses the dark-scheme accent, #9f80e5, for the brand and primary buttons', () => {
    expect(properties['--brand-primary']).toBe('#9f80e5')
    expect(properties['--default-button-primary-color']).toBe('#9f80e5')
  })

  it('keeps the focus ring at 3:1 on both backgrounds', () => {
    const focus = properties['--focus-color']
    expect(contrastRatio(focus, light.background)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(focus, dark.background)).toBeGreaterThanOrEqual(3)
  })

  it('leaves a focus colour that already works on both backgrounds exactly as it is', () => {
    const roles = {
      light: { ...light, background: '#ffffff' },
      dark: { ...dark, focus: '#0050d0' },
    }
    expect(legacyThemeProperties(roles)['--focus-color']).toBe('#0050d0')
  })

  it('falls back to the dark focus colour when no lift can serve both backgrounds', () => {
    const roles = {
      light: { ...light, background: '#808080' },
      dark: { ...dark, background: '#707070', focus: '#9f80e5' },
    }
    expect(legacyThemeProperties(roles)['--focus-color']).toBe('#9f80e5')
  })

  it('sets only the colour properties it means to: no state colours and no fonts', () => {
    expect(Object.keys(properties).sort()).toEqual(
      [
        '--black',
        '--white',
        '--gray-base',
        '--brand-primary',
        '--default-button-primary-color',
        '--focus-color',
        '--main-navigation-color',
        '--main-navigation-color--inverted',
        '--component-bg',
        '--component-text-color',
      ].sort(),
    )
    for (const key of Object.keys(properties)) {
      expect(key).not.toMatch(/success|warning|danger|state|font/)
    }
  })

  it('follows a client brand instead of Currawong', () => {
    const mapped = legacyThemeProperties(client)
    expect(mapped['--brand-primary']).toBe(client.dark.accentFill)
    expect(mapped['--main-navigation-color']).toBe(client.dark.background)
    expect(mapped['--component-bg']).toBe(client.light.background)
    expect(Object.values(mapped)).not.toContain('#9f80e5')
  })

  it('gives every property a lowercase hex', () => {
    for (const value of Object.values(properties)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('createStudioTheme', () => {
  it('hands the mapped properties to the builder and returns its theme', () => {
    const builder = vi.fn(() => ({ theme: true }))
    expect(createStudioTheme(currawongBrand, builder)).toEqual({ theme: true })
    expect(builder).toHaveBeenCalledWith(legacyThemeProperties(currawongBrand))
  })

  it('returns undefined, so Studio uses its default theme, when the builder is missing', () => {
    expect(createStudioTheme(currawongBrand, undefined)).toBeUndefined()
    expect(createStudioTheme(currawongBrand, { not: 'a function' })).toBeUndefined()
  })
})

describe('buildStudioTheme', () => {
  it("builds with sanity's buildLegacyTheme", () => {
    expect(buildStudioTheme(currawongBrand)).toEqual({
      builtFrom: legacyThemeProperties(currawongBrand),
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
