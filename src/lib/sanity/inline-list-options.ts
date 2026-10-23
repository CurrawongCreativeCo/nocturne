import { stegaClean } from 'next-sanity'

import { letterSpacingOf, type LetterSpacing } from './letter-spacing'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * How a short list of labels is drawn in one row (components/ui/inline-list.tsx): the Link list's
 * Service categories and the hero’s optional eyebrow labels. The separators are drawn by the page,
 * never typed, so they can take their own colour and never dangle at the end of a line. Kept free of
 * Studio code so the site can import it; the schema is in features/pages/schemas/sections.
 */

/** Drawn shapes, not characters, so they look the same in every font and take any colour. */
export const INLINE_SEPARATORS = ['bullet', 'dot', 'line', 'diamond', 'none'] as const
export type InlineSeparator = (typeof INLINE_SEPARATORS)[number]

export const INLINE_SEPARATOR_TITLES: Record<InlineSeparator, string> = {
  bullet: '•  Bullet',
  dot: '·  Middle dot',
  line: '|  Line',
  diamond: '◆  Diamond',
  none: 'None',
}

export const INLINE_SIZES = ['small', 'medium', 'large'] as const
export type InlineSize = (typeof INLINE_SIZES)[number]
export const INLINE_SIZE_TITLES: Record<InlineSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export const INLINE_WEIGHTS = ['regular', 'medium', 'semibold'] as const
export type InlineWeight = (typeof INLINE_WEIGHTS)[number]
export const INLINE_WEIGHT_TITLES: Record<InlineWeight, string> = {
  regular: 'Regular',
  medium: 'Medium',
  semibold: 'Bold',
}

/** Uppercase keeps its original spacing until Letter spacing is chosen. */
export const INLINE_CASES = ['normal', 'uppercase'] as const
export type InlineCase = (typeof INLINE_CASES)[number]
export const INLINE_CASE_TITLES: Record<InlineCase, string> = {
  normal: 'As typed',
  uppercase: 'Capitals',
}

export const INLINE_GAPS = ['compact', 'comfortable', 'wide'] as const
export type InlineGap = (typeof INLINE_GAPS)[number]
export const INLINE_GAP_TITLES: Record<InlineGap, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  wide: 'Wide',
}

/** On a phone: one row that wraps (separators stay between words), or one label per line. */
export const INLINE_PHONE_LAYOUTS = ['wrap', 'stack'] as const
export type InlinePhoneLayout = (typeof INLINE_PHONE_LAYOUTS)[number]
export const INLINE_PHONE_LAYOUT_TITLES: Record<InlinePhoneLayout, string> = {
  wrap: 'One row that wraps',
  stack: 'One per line',
}

/** The colours a category list offers for its words and its separators (Inherit and Custom too). */
export const INLINE_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const
const OFFERED: readonly ThemeColour[] = ['inherit', ...INLINE_COLOUR_CHOICES, 'custom']

/** The Design › Service categories box as a query returns it. */
export interface InlineListDesignInput {
  separator?: string | null
  size?: string | null
  weight?: string | null
  letterSpacing?: string | null
  textCase?: string | null
  gap?: string | null
  phoneLayout?: string | null
  textColour?: ThemeColourInput | null
  separatorColour?: ThemeColourInput | null
}

export interface InlineListDesign {
  separator: InlineSeparator
  size: InlineSize
  weight: InlineWeight
  letterSpacing?: LetterSpacing
  textCase: InlineCase
  gap: InlineGap
  phoneLayout: InlinePhoneLayout
  /** CSS colours. The words keep the text colour and the separators take Primary until one is chosen. */
  textColour: string | undefined
  separatorColour: string
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/**
 * The finished look with nothing chosen: small medium-weight words as typed, bullets in the
 * theme's Primary (the shade Brand colours keeps readable, through the same tokens as every other
 * colour choice, so it follows the section's tone), a comfortable gap and a row that wraps.
 */
export function resolveInlineListDesign(
  design: InlineListDesignInput | null | undefined,
): InlineListDesign {
  return {
    ...(letterSpacingOf(design?.letterSpacing) && {
      letterSpacing: letterSpacingOf(design?.letterSpacing),
    }),
    separator: pick(INLINE_SEPARATORS, design?.separator) ?? 'bullet',
    size: pick(INLINE_SIZES, design?.size) ?? 'small',
    weight: pick(INLINE_WEIGHTS, design?.weight) ?? 'medium',
    textCase: pick(INLINE_CASES, design?.textCase) ?? 'normal',
    gap: pick(INLINE_GAPS, design?.gap) ?? 'comfortable',
    phoneLayout: pick(INLINE_PHONE_LAYOUTS, design?.phoneLayout) ?? 'wrap',
    textColour: themeColourCss(design?.textColour, OFFERED),
    separatorColour:
      themeColourCss(design?.separatorColour, OFFERED) ??
      themeColourCss({ colour: 'accent' }) ??
      'currentColor',
  }
}

/** The labels to draw: trimmed, without empty ones. Stega stays on, for click-to-edit. */
export function inlineListItems(items: readonly (string | null)[] | null | undefined): string[] {
  return (items ?? []).filter(
    (item): item is string => typeof item === 'string' && stegaClean(item).trim() !== '',
  )
}
