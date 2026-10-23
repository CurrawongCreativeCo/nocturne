import { letterSpacingOf, type LetterSpacing } from './letter-spacing'
import { stegaClean } from 'next-sanity'

import type { SanityImageData } from '@/types/sanity'

import { BADGE_ICONS, type BadgeIconName } from './badge-icons'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * Decorative dividers inside a section (components/ui/decorative-divider.tsx): a rule between two
 * parts of the content, with an optional centre (a diamond, an icon, a few words or a small picture)
 * between two lines: "—— Stay connected ——", "—— ☀ ——". Not the section's shaped bottom edge (README,
 * "Section dividers"), which sits between sections. The schema is the shared `decorativeDivider`
 * type (lib/sanity/schema/decorative-divider.ts), so any section can offer one. Kept free of Studio
 * code so the site can import it.
 */

/** How the rule is drawn. Three dots stand alone; the others can hold a centre. */
export const DIVIDER_STYLES = ['none', 'line', 'fade', 'dots'] as const
export type DividerStyle = (typeof DIVIDER_STYLES)[number]

export const DIVIDER_STYLE_TITLES: Record<DividerStyle, string> = {
  none: 'None',
  line: 'Line',
  fade: 'Fading line',
  dots: 'Three dots',
}

export const DIVIDER_STYLE_DESCRIPTIONS: Record<DividerStyle, string> = {
  none: 'No divider here.',
  line: 'An even rule, with anything in the middle.',
  fade: 'Fades out towards its ends.',
  dots: 'Three small dots, centred.',
}

export const DIVIDER_CENTRES = ['none', 'diamond', 'icon', 'text', 'image'] as const
export type DividerCentre = (typeof DIVIDER_CENTRES)[number]

export const DIVIDER_CENTRE_TITLES: Record<DividerCentre, string> = {
  none: 'Nothing',
  diamond: 'Diamond',
  icon: 'Icon',
  text: 'Words',
  image: 'Picture',
}

/** The whole divider's length, centre included. */
export const DIVIDER_WIDTHS = ['short', 'medium', 'long', 'full'] as const
export type DividerWidth = (typeof DIVIDER_WIDTHS)[number]

export const DIVIDER_WIDTH_TITLES: Record<DividerWidth, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  full: 'Full width',
}

export const DIVIDER_THICKNESSES = ['thin', 'bold'] as const
export type DividerThickness = (typeof DIVIDER_THICKNESSES)[number]

export const DIVIDER_THICKNESS_TITLES: Record<DividerThickness, string> = {
  thin: 'Thin',
  bold: 'Bold',
}

/** The size of the icon, picture or words in the middle. */
export const DIVIDER_CENTRE_SIZES = ['small', 'medium', 'large'] as const
export type DividerCentreSize = (typeof DIVIDER_CENTRE_SIZES)[number]

export const DIVIDER_CENTRE_SIZE_TITLES: Record<DividerCentreSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

/** How the words are set: as typed, or spaced capitals. Both are letter-spaced a little. */
export const DIVIDER_TEXT_CASES = ['normal', 'uppercase'] as const
export type DividerTextCase = (typeof DIVIDER_TEXT_CASES)[number]

export const DIVIDER_TEXT_CASE_TITLES: Record<DividerTextCase, string> = {
  normal: 'As typed',
  uppercase: 'Capitals',
}

/** The words in the middle stay short: a label, not a sentence. */
export const DIVIDER_TEXT_MAX = 30

/** The colours a divider offers (Inherit and Custom too). */
export const DIVIDER_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const
const OFFERED: readonly ThemeColour[] = ['inherit', ...DIVIDER_COLOUR_CHOICES, 'custom']

/** One `decorativeDivider` as a query returns it. */
export interface DividerInput {
  style?: string | null
  width?: string | null
  thickness?: string | null
  centre?: string | null
  text?: string | null
  letterSpacing?: string | null
  textCase?: string | null
  icon?: string | null
  image?: SanityImageData | null
  centreSize?: string | null
  lineColour?: ThemeColourInput | null
  centreColour?: ThemeColourInput | null
}

export type ResolvedCentre =
  | { kind: 'diamond' }
  | { kind: 'icon'; icon: BadgeIconName }
  | { kind: 'text'; text: string; textCase: DividerTextCase; letterSpacing?: LetterSpacing }
  | { kind: 'image'; image: SanityImageData }

export interface ResolvedDivider {
  style: Exclude<DividerStyle, 'none'>
  width: DividerWidth
  thickness: DividerThickness
  centre: ResolvedCentre | null
  centreSize: DividerCentreSize
  /** CSS colours; undefined is the line colour, and the centre follows the lines. */
  lineColour: string | undefined
  centreColour: string | undefined
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/** The centre to draw, or null when it is Nothing or its content is missing. */
function resolveCentre(input: DividerInput): ResolvedCentre | null {
  switch (pick(DIVIDER_CENTRES, input.centre)) {
    case 'diamond':
      return { kind: 'diamond' }
    case 'icon': {
      const icon = BADGE_ICONS.find((option) => option.value === stegaClean(input.icon))?.value
      return icon ? { kind: 'icon', icon } : null
    }
    case 'text': {
      // Stega stays on the words, so visual editing can find them; only empty text is dropped.
      const text = input.text && stegaClean(input.text).trim() ? input.text : ''
      return text
        ? {
            kind: 'text',
            text,
            textCase: pick(DIVIDER_TEXT_CASES, input.textCase) ?? 'normal',
            ...(letterSpacingOf(input.letterSpacing) && {
              letterSpacing: letterSpacingOf(input.letterSpacing),
            }),
          }
        : null
    }
    case 'image':
      return input.image?.asset ? { kind: 'image', image: input.image } : null
    default:
      return null
  }
}

/**
 * One divider, or null for none (unset, None, or a style the schema never offered). Three dots
 * never take a centre. A Custom colour is drawn only when its hex is valid.
 */
export function resolveDivider(input: DividerInput | null | undefined): ResolvedDivider | null {
  const style = pick(DIVIDER_STYLES, input?.style)
  if (!input || !style || style === 'none') return null
  return {
    style,
    width: pick(DIVIDER_WIDTHS, input.width) ?? 'medium',
    thickness: pick(DIVIDER_THICKNESSES, input.thickness) ?? 'thin',
    centre: style === 'dots' ? null : resolveCentre(input),
    centreSize: pick(DIVIDER_CENTRE_SIZES, input.centreSize) ?? 'medium',
    lineColour: themeColourCss(input.lineColour, OFFERED),
    centreColour: themeColourCss(input.centreColour, OFFERED),
  }
}

/** Where a Link list draws a divider: each has its own look (Design › Dividers). */
export const LINK_LIST_DIVIDER_PLACEMENTS = [
  'afterCategories',
  'afterProfile',
  'aboveSocial',
  'belowSocial',
] as const
export type LinkListDividerPlacement = (typeof LINK_LIST_DIVIDER_PLACEMENTS)[number]

/** The parts a Link list draws in order, and a divider by where it was placed. */
export type LinkListPart =
  | 'profile'
  | 'heading'
  | 'social'
  | 'links'
  | { divider: Exclude<LinkListDividerPlacement, 'afterCategories'> }

/**
 * The order of a Link list's parts with its dividers in place. A divider only ever sits between two
 * parts that are drawn: never first, never last, never for a part that is missing (no profile, no
 * social icons). Where two would meet (after the profile, right above the icons), the later one is
 * kept: it was chosen for what follows. "After the profile" goes straight under the profile, so a
 * heading comes after it. (The divider under the categories sits inside the profile.)
 */
export function linkListParts({
  profile,
  heading,
  social,
  socialsBelow,
  dividers,
}: {
  profile: boolean
  heading: boolean
  social: boolean
  socialsBelow: boolean
  /** The placements with a divider to draw. */
  dividers: readonly LinkListDividerPlacement[]
}): LinkListPart[] {
  const has = (placement: LinkListDividerPlacement) => dividers.includes(placement)
  const socialRun: LinkListPart[] = social
    ? [
        ...(has('aboveSocial') ? [{ divider: 'aboveSocial' } as const] : []),
        'social',
        ...(has('belowSocial') ? [{ divider: 'belowSocial' } as const] : []),
      ]
    : []
  const parts: LinkListPart[] = [
    ...(profile ? (['profile'] as const) : []),
    ...(profile && has('afterProfile') ? [{ divider: 'afterProfile' } as const] : []),
    ...(heading ? (['heading'] as const) : []),
    ...(socialsBelow ? [] : socialRun),
    'links',
    ...(socialsBelow ? socialRun : []),
  ]
  const isDivider = (part: LinkListPart | undefined) => typeof part === 'object'
  return parts.filter(
    (part, index) =>
      !isDivider(part) || (index > 0 && index < parts.length - 1 && !isDivider(parts[index + 1])),
  )
}
