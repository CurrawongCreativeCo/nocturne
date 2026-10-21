import type { buildStudioTheme } from '../theme'

/** Themer returns a complete UI theme. The preview sets the scheme; Studio follows Appearance. */
export function toUiTheme(theme: ReturnType<typeof buildStudioTheme>) {
  return theme
}
