import * as sanity from 'sanity'
import type { WorkspaceOptions } from 'sanity'

import type { StudioBrand } from '@/config/studio-brand/types'
import { adjustLightnessForContrast, contrastRatio } from '@/lib/color/contrast'

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
 * - So the dark scheme's background and text are `--main-navigation-color` and its inverted value,
 *   but the accent (`--default-button-primary-color`, plus `--brand-primary` for the info state) and
 *   the focus ring (`--focus-color`) are single values shared by both schemes.
 * - Sanity picks the label colour on a solid button itself (the card background, paper or ink).
 *   Success, warning and danger have their own properties and are left alone here.
 *
 * Why the markers are stripped (see `createStudioTheme`): `buildLegacyTheme` returns `__legacy: true` and
 * `__dark`. In Sanity 6.18 `StudioThemeProvider` treats such a theme as pinned to one scheme (light or
 * dark by the component background) and provides a scheme setter of `false`, which is what removes
 * the Appearance section from the user menu and ignores the stored `sanityStudio:ui:colorScheme`. The
 * `color` it builds has both schemes, so the markers are dropped and Studio handles it like any
 * other theme: Appearance (System, Light, Dark) returns and System is the default.
 *
 * Choices (see "CMS branding" in the README):
 * - Neutrals are branded in both modes: dark mode gets ink and paper through the navigation
 *   properties. Dark mode came out coherent, so the "brand only accent, focus and navigation"
 *   fallback was not needed.
 * - The accent is the dark-scheme one (#9f80e5 for Currawong), because violet on ink is 2.5:1.
 *   It is shared, so in light mode it is 2.7:1 on paper: the cost of the single-accent limit.
 * - The focus ring is the dark-scheme focus colour, lifted just enough to reach 3:1 on the light
 *   background too, when that keeps it at 3:1 on the dark one.
 * - Fonts stay Sanity's (approved): no font properties are set.
 */

const NON_TEXT_CONTRAST = 3

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
  '--default-button-primary-color': string
  '--focus-color': string
  '--main-navigation-color': string
  '--main-navigation-color--inverted': string
  '--component-bg': string
  '--component-text-color': string
}

/** One focus colour for both schemes: the dark one, lifted to 3:1 on the light background if that doesn't cost it 3:1 on the dark one. */
function sharedFocus(light: Roles, dark: Roles): string {
  const candidate = dark.focus
  if (contrastRatio(candidate, light.background) >= NON_TEXT_CONTRAST) return candidate
  const lifted = adjustLightnessForContrast(candidate, light.background, NON_TEXT_CONTRAST).hex
  return contrastRatio(lifted, dark.background) >= NON_TEXT_CONTRAST ? lifted : candidate
}

/** Maps the resolved brand roles to the legacy properties. Pure, so the mapping is unit-tested. */
export function legacyThemeProperties(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
): StudioLegacyProperties {
  const { light, dark } = brand
  return {
    // Light scheme: component colours.
    '--component-bg': light.background,
    '--component-text-color': light.text,
    '--white': light.background,
    '--black': light.text,
    // The mid colour the neutral tints are mixed from.
    '--gray-base': light.surfaceBorder,
    // Dark scheme: the legacy "main navigation" colours.
    '--main-navigation-color': dark.background,
    '--main-navigation-color--inverted': dark.text,
    // Shared by both schemes.
    '--brand-primary': dark.accentFill,
    '--default-button-primary-color': dark.accentFill,
    '--focus-color': sharedFocus(light, dark),
  }
}

/**
 * Builds the theme with whatever `builder` is. When it is not a function (a future Sanity major
 * removed `buildLegacyTheme`) the result is undefined and Studio uses its default theme.
 */
export function createStudioTheme(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
  builder: unknown,
): StudioThemeValue | undefined {
  if (typeof builder !== 'function') return undefined
  return withoutSchemeLock((builder as ThemeBuilder)(legacyThemeProperties(brand)))
}

/** Drops the markers that make Studio pin one scheme and hide Appearance; `color` and `fonts` keep both schemes. */
function withoutSchemeLock(theme: StudioThemeValue): StudioThemeValue {
  const unlocked: Record<string, unknown> = { ...theme }
  delete unlocked.__legacy
  delete unlocked.__dark
  return unlocked
}

/** The `theme` for sanity.config.ts: the branded legacy theme, or undefined if Sanity no longer has one. */
export function buildStudioTheme(
  brand: Pick<StudioBrand, 'light' | 'dark'>,
): StudioThemeValue | undefined {
  // Looked up by name, not imported, so a removed export is a fallback rather than a build error.
  return createStudioTheme(brand, Reflect.get(sanity, 'buildLegacyTheme'))
}
