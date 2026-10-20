import { stegaClean } from 'next-sanity'

import { validColour } from '@/lib/color/heading-gradient'

/**
 * The shared colour choice for one element of a section (schema: lib/sanity/schema/theme-colour.ts):
 * "which colour of the theme does this icon, name or arrow use". The choices are the theme's own
 * roles, named as in Brand colours and the edge accent (Primary, Secondary, Highlight), plus the two
 * text colours, Transparent (offered only to backgrounds) and a Custom hex. Every choice but Custom is a token, so it follows the section's tone
 * (`[data-tone]` in tokens.generated.css redefines `accent`, `ink` and `ink-muted` on dark tones).
 * Kept free of Studio code so the site can import it.
 *
 * Inheritance is deliberately short: the section's tone sets the text colours, the component decides
 * each element's default, and this field overrides one element. Unset (or Inherit) draws exactly what
 * the component drew before the field existed.
 */
export const THEME_COLOURS = [
  'inherit',
  'ink',
  'muted',
  'accent',
  'accent-2',
  'highlight',
  'transparent',
  'custom',
] as const
export type ThemeColour = (typeof THEME_COLOURS)[number]

export const THEME_COLOUR_TITLES: Record<ThemeColour, string> = {
  inherit: 'Inherit',
  ink: 'Text',
  muted: 'Muted text',
  accent: 'Primary',
  'accent-2': 'Secondary',
  highlight: 'Highlight',
  transparent: 'Transparent',
  custom: 'Custom',
}

/** The token each choice draws with: Primary uses `accent-text`, the shade Brand colours keeps readable as text. */
const TOKEN_CSS: Record<Exclude<ThemeColour, 'inherit' | 'custom'>, string> = {
  ink: 'var(--color-ink)',
  muted: 'var(--color-ink-muted)',
  accent: 'var(--color-accent-text)',
  'accent-2': 'var(--color-accent-2)',
  highlight: 'var(--color-highlight)',
  // A deliberate "no fill" for a background, never the same as Inherit (which keeps the component's own).
  transparent: 'transparent',
}

/** A `themeColour` as a query returns it: untrusted, so both values are checked. */
export interface ThemeColourInput {
  colour?: string | null
  hex?: string | null
}

/**
 * The CSS colour for an element, or undefined to keep the component's own. `allowed` is the set the
 * field offered, so a value stored under another component's list (or tampered with) draws nothing
 * new. Only a validated six-digit hex reaches CSS for Custom; a Custom with no valid hex inherits.
 */
export function themeColourCss(
  input: ThemeColourInput | null | undefined,
  allowed: readonly ThemeColour[] = THEME_COLOURS,
): string | undefined {
  const colour = stegaClean(input?.colour)
  const chosen = allowed.find((option) => option === colour)
  if (!chosen || chosen === 'inherit') return undefined
  if (chosen === 'custom') return validColour(stegaClean(input?.hex)) ?? undefined
  return TOKEN_CSS[chosen]
}

/** `style={{ color }}` for an element, or undefined when it keeps its own colour. */
export function themeColourStyle(
  input: ThemeColourInput | null | undefined,
  allowed?: readonly ThemeColour[],
): { color: string } | undefined {
  const color = themeColourCss(input, allowed)
  return color ? { color } : undefined
}
