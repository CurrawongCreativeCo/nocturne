import * as sanity from 'sanity'
import type { WorkspaceOptions } from 'sanity'

import type { Scheme, StudioBrand } from '@/config/studio-brand/types'
import { adjustLightnessForContrast, relativeLuminance } from '@/lib/color/contrast'
import { hexToRgb, rgbToHex, type Rgb } from '@/lib/color/oklch'

/**
 * Studio theming: the only place the CMS brand becomes a Sanity theme, and the only file that uses
 * `buildLegacyTheme`. In Sanity 6.18 both it and the `theme` config option are marked "deprecated –
 * Will be removed in upcoming major version", so everything theme-related lives here, and anything
 * else (the logo, the workspace icon) keeps the brand without it.
 *
 * How `buildLegacyTheme` works (read from node_modules/sanity, 6.18):
 * - It lays the properties you pass over Sanity's defaults, resolves them into one palette (black,
 *   white, gray, component bg/fg, button colours, focus, main navigation bg/fg, state colours) and
 *   builds 11 tints of each mid colour: 50-400 mix it into the background (10-80%), 600-950 into the
 *   foreground.
 * - One call builds BOTH schemes from that one palette. The light scheme is made from the component
 *   bg/fg; the dark scheme from the main navigation bg/fg (the code calls it "navbar"). That name is
 *   misleading: the real navbar is an ordinary card in whichever scheme is active, so it is paper in
 *   light mode and ink in dark mode.
 * - Every accent is a single value shared by both schemes. A solid button is the card background
 *   multiplied (light) or screened (dark) with the button colour's 500 tint, which is the colour
 *   itself, and its label is the card background blended with itself. Selected tabs and tools use
 *   the "info" state colour (`--brand-primary`): 20% of it mixed into the background, then blended
 *   with the background again. A button colour that is not set falls back to Sanity's slate grey.
 *
 * Choices (see "CMS branding" in the README):
 * - The builder runs once per scheme, each time with that scheme's roles as both the component and
 *   the navigation colours, and the theme takes `color.light` from the first and `color.dark` from
 *   the second. That gives each scheme its own accent, focus ring, grey and neutral button, which
 *   one call cannot: shared, the dark accent (#9f80e5) made light mode's buttons pale violet.
 * - Colours are pre-compensated for the blend, so a primary button comes out as the brand's accent
 *   fill and not a shade of it multiplied into the paper.
 * - Sanity picks the label on a solid button itself (the card background, not `onAccent`), so a fill
 *   is moved just far enough to reach 4.5:1 against that label. Currawong's accents already do.
 * - Neutral buttons are the text colour pulled toward the background, so they stay warm.
 * - Selection is a clear tint of the accent: the info colour is solved so the selected background
 *   is 35% accent on the background, instead of the dusty mix the blend gives by default.
 * - Fonts stay Sanity's (approved): no font properties are set.
 */

/** WCAG's 4.5:1 with a little margin, so rounding in the blend can't tip a label under it. */
const LABEL_CONTRAST = 4.6
/** How much of the accent a selected tab or tool shows on the background. */
const SELECTION_STRENGTH = 0.35
/** How far the neutral button sits from the text colour toward the background. */
const NEUTRAL_BUTTON_MIX = 0.65

type Roles = StudioBrand['light']

/** The value of the (deprecated) `theme` option; named from the option so this file doesn't import the deprecated type. */
type StudioThemeValue = NonNullable<WorkspaceOptions['theme']>

type ThemeBuilder = (properties: StudioLegacyProperties) => StudioThemeValue

/** The legacy properties the brand sets; everything else keeps Sanity's default. */
export interface StudioLegacyProperties {
  '--black': string
  '--white': string
  '--gray-base': string
  '--brand-primary': string
  '--default-button-color': string
  '--default-button-primary-color': string
  '--focus-color': string
  '--main-navigation-color': string
  '--main-navigation-color--inverted': string
  '--component-bg': string
  '--component-text-color': string
}

type Blend = 'multiply' | 'screen'

/** Sanity screens in a dark scheme and multiplies in a light one, decided by which of bg and text is lighter. */
function blendFor(roles: Roles): Blend {
  return relativeLuminance(roles.background) < relativeLuminance(roles.text) ? 'screen' : 'multiply'
}

const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)))

/** Applies `fn` to the matching channels of two colours. */
const channelwise = (a: Rgb, b: Rgb, fn: (x: number, y: number) => number): Rgb => [
  clamp(fn(a[0], b[0])),
  clamp(fn(a[1], b[1])),
  clamp(fn(a[2], b[2])),
]

/** `weight` of `a` mixed into `b`, as polished's `mix(weight, a, b)` that Sanity uses. */
function mix(weight: number, a: string, b: string): string {
  return rgbToHex(channelwise(hexToRgb(a), hexToRgb(b), (x, y) => x * weight + y * (1 - weight)))
}

/** One channel of Sanity's blend of `colour` over `background`. */
const blendChannel = (blend: Blend, background: number, colour: number) =>
  blend === 'multiply'
    ? (background * colour) / 255
    : 255 - ((255 - background) * (255 - colour)) / 255

/** Sanity's blend of a colour over a background (the label and the fill both go through it). */
function blendColours(blend: Blend, background: string, colour: string): string {
  return rgbToHex(
    channelwise(hexToRgb(background), hexToRgb(colour), (b, c) => blendChannel(blend, b, c)),
  )
}

/** One channel of the colour that Sanity's blend over `background` turns into `target`. */
const unblendChannel = (blend: Blend, background: number, target: number) =>
  blend === 'multiply'
    ? (target * 255) / Math.max(background, 1)
    : 255 - ((255 - target) * 255) / Math.max(255 - background, 1)

/** The colour that Sanity's blend over `background` turns into `target`, as near as 0-255 allows. */
function precompensate(blend: Blend, background: string, target: string): string {
  return rgbToHex(
    channelwise(hexToRgb(background), hexToRgb(target), (b, t) => unblendChannel(blend, b, t)),
  )
}

/** The colour whose 20% mix into the background, blended with the background, is `target`. */
function precompensateSelection(blend: Blend, background: string, target: string): string {
  return rgbToHex(
    channelwise(
      hexToRgb(background),
      hexToRgb(precompensate(blend, background, target)),
      (b, wanted) => (wanted - 0.8 * b) / 0.2,
    ),
  )
}

/**
 * Maps one scheme's resolved brand roles to the legacy properties for a build of that scheme. Pure,
 * so the mapping is unit-tested. The scheme's roles fill both the component and the navigation
 * colours; `createStudioTheme` then keeps only that scheme's half of the result.
 */
export function legacyThemeProperties(roles: Roles, scheme: Scheme): StudioLegacyProperties {
  const blend = blendFor(roles)
  // What Sanity prints on a solid button: the background blended with itself.
  const label = blendColours(blend, roles.background, roles.background)
  const fill = adjustLightnessForContrast(roles.accentFill, label, LABEL_CONTRAST).hex
  const neutral = adjustLightnessForContrast(
    mix(NEUTRAL_BUTTON_MIX, roles.text, roles.background),
    label,
    LABEL_CONTRAST,
  ).hex
  const selection = mix(SELECTION_STRENGTH, fill, roles.background)
  const dark = scheme === 'dark'

  return {
    '--component-bg': roles.background,
    '--component-text-color': roles.text,
    '--main-navigation-color': roles.background,
    '--main-navigation-color--inverted': roles.text,
    // Sanity draws shadows with the black and uses the white as the fallback text.
    '--black': dark ? roles.background : roles.text,
    '--white': dark ? roles.text : roles.background,
    '--gray-base': roles.surfaceBorder,
    '--default-button-color': precompensate(blend, roles.background, neutral),
    '--default-button-primary-color': precompensate(blend, roles.background, fill),
    '--brand-primary': precompensateSelection(blend, roles.background, selection),
    '--focus-color': roles.focus,
  }
}

/**
 * Builds the theme with whatever `builder` is: once per scheme, composed as described above. When
 * it is not a function (a future Sanity major removed `buildLegacyTheme`) the result is undefined
 * and Studio uses its default theme.
 */
export function createStudioTheme(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
  builder: unknown,
): StudioThemeValue | undefined {
  if (typeof builder !== 'function') return undefined
  const build = builder as ThemeBuilder
  const light = build(legacyThemeProperties(brand.light, 'light'))
  const dark = build(legacyThemeProperties(brand.dark, 'dark'))
  if (!light.color || !dark.color) return light
  return { ...light, color: { light: light.color.light, dark: dark.color.dark } }
}

/** The `theme` for sanity.config.ts: the branded legacy theme, or undefined if Sanity no longer has one. */
export function buildStudioTheme(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
): StudioThemeValue | undefined {
  // Looked up by name, not imported, so a removed export is a fallback rather than a build error.
  return createStudioTheme(brand, Reflect.get(sanity, 'buildLegacyTheme'))
}
