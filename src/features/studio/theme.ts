import { buildTheme } from '@sanity/themer'
import type { RootTheme, ThemeColorCard_v2, ThemeColorState_v2 } from '@sanity/ui/theme'

import type { StudioBrand, StudioBrandRoles } from '@/config/studio-brand/types'
import { adjustLightnessForContrast } from '@/lib/color/contrast'
import { hexToRgb, rgbToHex } from '@/lib/color/oklch'

/** The workspace theme covers UI 4. Sanity's UI 5 alpha components retain their own styling. */
export interface StudioFontFamilies {
  interface: string
  heading: string
}

const DEFAULT_FONTS: StudioFontFamilies = {
  interface: 'Inter, sans-serif',
  heading: 'Newsreader, serif',
}

function mix(weight: number, a: string, b: string): string {
  const left = hexToRgb(a)
  const right = hexToRgb(b)
  return rgbToHex([
    left[0] * weight + right[0] * (1 - weight),
    left[1] * weight + right[1] * (1 - weight),
    left[2] * weight + right[2] * (1 - weight),
  ])
}

/** Keep icons and subdued labels readable alongside the main label on each state. */
function setState(state: ThemeColorState_v2, bg: string, fg: string, accent: string) {
  state.bg = bg
  state.fg = fg
  state.icon = fg
  state.muted.fg = fg
  state.accent.fg = adjustLightnessForContrast(accent, bg, 4.6).hex
  state.link.fg = state.accent.fg
}

/** Apply exact runtime roles through public v2 tokens; Themer supplies the remaining semantic tones. */
function applyRoles(card: ThemeColorCard_v2, roles: StudioBrandRoles, neutral: boolean) {
  if (neutral) {
    card.bg = roles.background
    card.fg = roles.text
    card.icon = roles.text
    card.border = roles.surfaceBorder
    card.muted.fg = adjustLightnessForContrast(
      mix(0.65, roles.text, roles.background),
      roles.background,
      4.6,
    ).hex
    card.accent.fg = roles.accentText
    card.link.fg = roles.accentText
    for (const state of Object.values(card.input.default)) {
      state.bg = roles.surface
      state.fg = roles.text
      state.border = roles.surfaceBorder
      state.placeholder = adjustLightnessForContrast(card.muted.fg, roles.surface, 4.6).hex
    }
  }
  card.focusRing = roles.focus
  const neutralFill = adjustLightnessForContrast(
    mix(0.65, roles.text, roles.background),
    roles.background,
    4.6,
  ).hex
  for (const [mode, tones] of Object.entries(card.button)) {
    for (const tone of ['default', 'neutral', 'primary'] as const) {
      const primary = tone === 'primary'
      const fill = primary ? roles.accentFill : neutralFill
      const label = primary ? roles.onAccent : roles.background
      for (const [name, state] of Object.entries(tones[tone])) {
        if (name === 'disabled') continue
        if (mode === 'default') {
          const bg = name === 'enabled' ? fill : mix(0.9, fill, label)
          const fg =
            primary && name === 'enabled' ? label : adjustLightnessForContrast(label, bg, 4.6).hex
          setState(state, bg, fg, label)
        } else {
          const strength = name === 'enabled' ? 0 : name === 'selected' ? 0.35 : 0.15
          const bg = mix(strength, roles.accentFill, card.bg)
          const fg = primary && name !== 'selected' ? roles.accentText : roles.text
          setState(state, bg, adjustLightnessForContrast(fg, bg, 4.6).hex, roles.accentText)
        }
      }
    }
  }
  for (const tone of ['default', 'neutral', 'primary'] as const) {
    for (const [name, state] of Object.entries(card.selectable[tone])) {
      if (name === 'disabled') continue
      const bg = name === 'enabled' ? card.bg : mix(0.35, roles.accentFill, card.bg)
      setState(state, bg, adjustLightnessForContrast(roles.text, bg, 4.6).hex, roles.accentText)
    }
  }
}

/** No legacy builder, conversion helpers or experimental tool; both Appearance schemes remain available. */
export function buildStudioTheme(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
  families: StudioFontFamilies = DEFAULT_FONTS,
): RootTheme {
  const options = (roles: StudioBrandRoles) => ({
    accent: roles.accentFill,
    background: roles.background,
    text: roles.text,
  })
  const theme = buildTheme({ light: options(brand.light), dark: options(brand.dark) })
  const v2 = theme.v2
  if (!v2) throw new Error('Themer must provide a v2 Studio theme')
  v2.font = {
    ...v2.font,
    heading: { ...v2.font.heading, family: families.heading },
    label: { ...v2.font.label, family: families.interface },
    text: { ...v2.font.text, family: families.interface },
  }
  // Studio 6 still reads compatibility font fields for document titles.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- mirror the public v2 font into Studio's compatibility boundary
  theme.fonts = v2.font
  for (const scheme of ['light', 'dark'] as const) {
    for (const [tone, card] of Object.entries(v2.color[scheme])) {
      applyRoles(card, brand[scheme], ['default', 'transparent', 'neutral'].includes(tone))
    }
  }
  return theme
}
