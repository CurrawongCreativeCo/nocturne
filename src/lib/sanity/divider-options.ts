import { stegaClean } from 'next-sanity'

import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * Decorative dividers inside a section (components/ui/decorative-divider.tsx): a small rule between
 * two parts of the content, such as the profile and the links, or around the social icons. Not the
 * section's shaped bottom edge (README, "Section dividers"), which sits between sections. Kept free
 * of Studio code so the site can import it.
 */

export const DIVIDER_STYLES = ['none', 'line', 'fade', 'dots', 'diamond'] as const
export type DividerStyle = (typeof DIVIDER_STYLES)[number]

export const DIVIDER_STYLE_TITLES: Record<DividerStyle, string> = {
  none: 'None',
  line: 'Line',
  fade: 'Fading line',
  dots: 'Three dots',
  diamond: 'Line with a diamond',
}

export const DIVIDER_STYLE_DESCRIPTIONS: Record<DividerStyle, string> = {
  none: 'No dividers.',
  line: 'A thin, even rule.',
  fade: 'A rule that fades out at both ends.',
  dots: 'Three small dots, centred.',
  diamond: 'A rule broken by a small diamond.',
}

export const DIVIDER_WIDTHS = ['short', 'medium', 'full'] as const
export type DividerWidth = (typeof DIVIDER_WIDTHS)[number]

export const DIVIDER_WIDTH_TITLES: Record<DividerWidth, string> = {
  short: 'Short',
  medium: 'Medium',
  full: 'Full width',
}

/** Where a Link list draws its dividers. The profile while none is ticked. */
export const DIVIDER_PLACEMENTS = ['afterProfile', 'aboveSocial', 'belowSocial'] as const
export type DividerPlacement = (typeof DIVIDER_PLACEMENTS)[number]

export const DIVIDER_PLACEMENT_TITLES: Record<DividerPlacement, string> = {
  afterProfile: 'After the profile',
  aboveSocial: 'Above the social icons',
  belowSocial: 'Below the social icons',
}

/** The colours a divider offers (Inherit and Custom too). Inherit is the line colour. */
export const DIVIDER_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const
const OFFERED: readonly ThemeColour[] = ['inherit', ...DIVIDER_COLOUR_CHOICES, 'custom']

/** The Design › Dividers box as a query returns it. */
export interface DividerInput {
  style?: string | null
  width?: string | null
  placements?: readonly (string | null)[] | null
  colour?: ThemeColourInput | null
}

export interface ResolvedDivider {
  style: Exclude<DividerStyle, 'none'>
  width: DividerWidth
  /** A CSS colour, or undefined for the line colour. */
  colour: string | undefined
  placements: DividerPlacement[]
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/** The dividers to draw, or null for none (unset, None, or a style the schema never offered). */
export function resolveDivider(input: DividerInput | null | undefined): ResolvedDivider | null {
  const style = pick(DIVIDER_STYLES, input?.style)
  if (!style || style === 'none') return null
  const placements = DIVIDER_PLACEMENTS.filter((placement) =>
    (input?.placements ?? []).some((value) => stegaClean(value) === placement),
  )
  return {
    style,
    width: pick(DIVIDER_WIDTHS, input?.width) ?? 'medium',
    colour: themeColourCss(input?.colour, OFFERED),
    placements: placements.length > 0 ? placements : ['afterProfile'],
  }
}

/** The parts a Link list draws, in order; `divider` where one goes. */
export type LinkListPart = 'profile' | 'heading' | 'social' | 'links' | 'divider'

/**
 * The order of a Link list's parts with its dividers in place. A divider only ever sits between two
 * parts that are drawn: never first, never last, never two in a row, and never for a part that is
 * missing (no social icons, no profile). "After the profile" goes straight under the profile, so a
 * heading under the profile comes after it.
 */
export function linkListParts({
  profile,
  heading,
  social,
  socialsBelow,
  placements,
}: {
  profile: boolean
  heading: boolean
  social: boolean
  socialsBelow: boolean
  placements: readonly DividerPlacement[]
}): LinkListPart[] {
  const has = (placement: DividerPlacement) => placements.includes(placement)
  const socialRun: LinkListPart[] = social
    ? [
        ...(has('aboveSocial') ? (['divider'] as const) : []),
        'social',
        ...(has('belowSocial') ? (['divider'] as const) : []),
      ]
    : []
  const parts: LinkListPart[] = [
    ...(profile ? (['profile'] as const) : []),
    ...(profile && has('afterProfile') ? (['divider'] as const) : []),
    ...(heading ? (['heading'] as const) : []),
    ...(socialsBelow ? [] : socialRun),
    'links',
    ...(socialsBelow ? socialRun : []),
  ]
  return parts.filter(
    (part, index) =>
      part !== 'divider' ||
      (index > 0 && index < parts.length - 1 && parts[index - 1] !== 'divider'),
  )
}
