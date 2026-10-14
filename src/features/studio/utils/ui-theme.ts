import { buildTheme } from '@sanity/ui/theme'

import type { buildStudioTheme } from '../theme'

type StudioThemeValue = NonNullable<ReturnType<typeof buildStudioTheme>>

/**
 * What `ThemeProvider` from @sanity/ui is given for a Studio theme. This is Studio's own
 * `getThemeValues` (StudioThemeProvider, node_modules/sanity 6.18), which is not exported: the
 * default @sanity/ui theme, with the workspace theme's `v2`, `fonts` and `color` laid over it. The
 * brand preview page uses it to render Sanity UI exactly as Studio does for the same theme.
 *
 * Studio then pins one colour scheme for a `buildLegacyTheme` theme (light or dark by whether the
 * light component background is darker than its text) and hides the scheme switch, so the page
 * passes `scheme` itself to show both.
 */
export function toUiTheme(theme: StudioThemeValue) {
  const base = buildTheme()
  /* eslint-disable @typescript-eslint/no-deprecated -- `fonts` and `color` are what a legacy theme sets and what Studio copies, as above */
  return {
    ...base,
    v2: theme.v2,
    fonts: theme.fonts ?? base.fonts,
    color: theme.color ?? base.color,
  }
  /* eslint-enable @typescript-eslint/no-deprecated */
}
