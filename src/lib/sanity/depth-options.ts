import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * Depth and glow for a section's surfaces (README, "Link list": Depth and glow): how far a link row,
 * a social button or the profile picture seems to lift off the page, and an optional soft halo in a
 * theme colour. Kept free of Studio code so the site can import it, and not tied to the Link list, so
 * other sections can reuse it (build plan tasks 146–148). The shadows come from tokens: box shadows from
 * the `shadow` group, picture shadows and the glow's size and strength from `depth`
 * (scripts/build-tokens.mjs). The glow's colour is a theme colour, so it follows the section's tone.
 *
 * Unset is "as the layout draws it": nothing changes on a page until a level is chosen.
 */

export const SHADOW_LEVELS = ['flat', 'soft', 'raised', 'floating'] as const
export type ShadowLevel = (typeof SHADOW_LEVELS)[number]

export const SHADOW_TITLES: Record<ShadowLevel, string> = {
  flat: 'Flat',
  soft: 'Soft',
  raised: 'Raised',
  floating: 'Floating',
}

export const SHADOW_DESCRIPTIONS: Record<ShadowLevel, string> = {
  flat: 'No shadow: sits on the page.',
  soft: 'A faint shadow, close to the page.',
  raised: 'Lifts clearly off the page.',
  floating: 'A deep, soft shadow, as if hovering.',
}

export const GLOW_LEVELS = ['off', 'soft', 'strong'] as const
export type GlowLevel = (typeof GLOW_LEVELS)[number]

export const GLOW_TITLES: Record<GlowLevel, string> = {
  off: 'Off',
  soft: 'Soft',
  strong: 'Strong',
}

/** What the glow lights up. Links only while nothing is ticked. */
export const GLOW_TARGETS = ['links', 'social', 'picture'] as const
export type GlowTarget = (typeof GLOW_TARGETS)[number]

export const GLOW_TARGET_TITLES: Record<GlowTarget, string> = {
  links: 'Links',
  social: 'Social icon buttons',
  picture: 'Profile picture',
}

/** The colours a glow offers (Inherit and Custom too). Inherit is Primary. */
export const GLOW_COLOUR_CHOICES = ['accent', 'accent-2', 'highlight', 'ink'] as const
const OFFERED: readonly ThemeColour[] = ['inherit', ...GLOW_COLOUR_CHOICES, 'custom']

// No shadow, written so it can sit in a list with the glow (`none` can't).
const NO_SHADOW = '0 0 #0000'
const BOX_SHADOW: Record<ShadowLevel, string> = {
  flat: NO_SHADOW,
  // Its own token, so an explicit Soft stays Soft when a site's card shadow is something else. The
  // fallback is for a tokens.json that predates `shadow.soft`.
  soft: 'var(--shadow-soft, var(--shadow-card))',
  raised: 'var(--shadow-raised)',
  floating: 'var(--shadow-floating)',
}
const PICTURE_SHADOW: Record<ShadowLevel, string> = {
  flat: '',
  soft: 'var(--depth-picture-soft)',
  raised: 'var(--depth-picture-raised)',
  floating: 'var(--depth-picture-floating)',
}

/** The Design › Depth and glow box as a query returns it. */
export interface DepthInput {
  linkShadow?: string | null
  socialShadow?: string | null
  pictureShadow?: string | null
  glow?: string | null
  glowTargets?: readonly (string | null)[] | null
  glowColour?: ThemeColourInput | null
}

/**
 * What one element draws: a class to put in place of its own shadow class, and the style that feeds
 * it. Undefined keeps the element exactly as the layout draws it.
 */
export interface ElementDepth {
  className: string
  style: CSSProperties
}

/** A box element's depth, given the shadow it draws on its own (kept when only a glow is chosen). */
export type BoxDepth = (own: string) => ElementDepth | undefined

export interface ResolvedDepth {
  links: BoxDepth
  social: BoxDepth
  picture: ElementDepth | undefined
}

/** The shadows the shared surfaces draw on their own, for `BoxDepth`. */
export const OWN_SHADOW = {
  none: NO_SHADOW,
  card: 'var(--shadow-card)',
  glass: 'var(--glass-shadow)',
  /** A card family that draws `shadow-card`: the site's Card depth when one is chosen, else the same. */
  siteCard: 'var(--card-depth, var(--shadow-card))',
  /** A card family that draws no shadow: the site's Card depth when one is chosen, else none. */
  siteCardFree: `var(--card-depth, ${NO_SHADOW})`,
} as const

/**
 * The classes a card family draws in place of `shadow-card` (or, for a family with no shadow, in
 * addition to its classes), so the site's Card depth reaches it. `--card-depth` is defined only when a
 * site chooses one (lib/design/site-decisions.ts), so unset these compute exactly what the family drew.
 * Nothing but cards reads the variable: `shadow-card` itself is untouched.
 */
export const CARD_SHADOW_CLASS = {
  shadowed: 'shadow-(--card-depth,var(--shadow-card))',
  free: 'shadow-(--card-depth,0_0_#0000)',
} as const

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/** A shadow level, or undefined while it is unset (or not one the schema offers). */
export const shadowLevelOf = (value: string | null | undefined): ShadowLevel | undefined =>
  pick(SHADOW_LEVELS, value)

export const glowLevelOf = (value: string | null | undefined): GlowLevel =>
  pick(GLOW_LEVELS, value) ?? 'off'

/** A glow level that was chosen (Off included), or undefined while it is inherited. */
export const glowChoiceOf = (value: string | null | undefined): GlowLevel | undefined =>
  pick(GLOW_LEVELS, value)

/** The ticked targets that exist; Links when none are. */
export function glowTargetsOf(values: DepthInput['glowTargets']): GlowTarget[] {
  const chosen = GLOW_TARGETS.filter((target) =>
    (values ?? []).some((value) => stegaClean(value) === target),
  )
  return chosen.length > 0 ? chosen : ['links']
}

/** `0 0 18px 0 color-mix(…)`: a halo of the glow colour, its size and strength from the depth tokens. */
function glowShadow(level: Exclude<GlowLevel, 'off'>, colour: string): string {
  return `var(--depth-glow-${level}) color-mix(in oklch, ${colour} var(--depth-glow-${level}-strength), transparent)`
}

/**
 * The same halo as a filter, for a picture, which follows its outline rather than its box. A filter
 * shadow has no spread, so it takes half the box glow's blur to look the same size.
 */
function glowFilter(level: Exclude<GlowLevel, 'off'>, colour: string): string {
  const blur = level === 'soft' ? '9px' : '14px'
  return `drop-shadow(0 0 ${blur} color-mix(in oklch, ${colour} var(--depth-glow-${level}-strength), transparent))`
}

/** What a box or picture is given: a shadow level, a glow and the glow's colour. All optional. */
export interface DepthLookInput {
  level?: ShadowLevel | undefined
  glow?: GlowLevel | undefined
  glowColour?: ThemeColourInput | null | undefined
}

const glowColourOf = (input: ThemeColourInput | null | undefined) =>
  themeColourCss(input, OFFERED) ?? themeColourCss({ colour: 'accent' }) ?? 'currentColor'

/**
 * A box element's depth (a card, a link row, a pill, a social button). The class replaces the element's
 * own shadow class (Tailwind's `shadow-(--…)` keeps rings, which the layouts use as borders); with only
 * a glow chosen, the element keeps `own`, the shadow it draws on its own (`OWN_SHADOW`), and the glow is
 * added to it. Undefined keeps the element exactly as the layout draws it.
 */
export function depthLook(input: DepthLookInput, own: string): ElementDepth | undefined {
  const glow = input.glow && input.glow !== 'off' ? input.glow : undefined
  if (!input.level && !glow) return undefined
  const shadow = input.level ? BOX_SHADOW[input.level] : own
  const halo = glow ? glowShadow(glow, glowColourOf(input.glowColour)) : undefined
  return {
    className: 'shadow-(--depth-shadow)',
    style: { '--depth-shadow': halo ? `${shadow}, ${halo}` : shadow } as CSSProperties,
  }
}

/**
 * A picture's depth: the same level and glow as a filter, which follows the picture's outline (a round
 * crop, a transparent logo) rather than its box. Undefined while neither is chosen.
 */
export function depthFilter(input: DepthLookInput): ElementDepth | undefined {
  const glow = input.glow && input.glow !== 'off' ? input.glow : undefined
  const filter = [
    input.level ? PICTURE_SHADOW[input.level] : '',
    glow ? glowFilter(glow, glowColourOf(input.glowColour)) : '',
  ]
    .filter(Boolean)
    .join(' ')
  return filter
    ? {
        className: '[filter:var(--depth-filter)]',
        style: { '--depth-filter': filter } as CSSProperties,
      }
    : undefined
}

/** A picture's stored `pictureDepthDesign` object as a query returns it (task 147): untrusted, so every value is checked. */
export interface PictureDepthInput {
  shadow?: string | null
  glow?: string | null
  glowColour?: ThemeColourInput | null
}

/** The room a picture's shadow and glow need, in px, on each side and above it (a shadow falls downwards). */
export interface PictureClearance {
  side: number
  top: number
}

/**
 * How much room a picture's shadow and glow need before a card that clips (Team, Events Featured) cuts them off,
 * by shadow level and glow. Measured in Chromium on the real cards (task 147): the distance from the picture's
 * edge at which the fade is down to a tint of 8/255 against the card (about 3%, the same as the card's own ring),
 * plus 2px, rounded up to an even number; the approved first values (Soft 8, Raised 16, Floating 28) are the
 * least any level gets. A glow's fade is much longer than its blur radius, and a glow added to a shadow lengthens
 * the shadow's own tail, so a combination is its own measurement, not the larger of the two. One table, so no
 * family makes up its own, and a change to the filter tokens (`depth.picture-*`, `depth.glow-*`) is a change here.
 */
export const PICTURE_CLEARANCE: Record<
  ShadowLevel,
  Record<GlowLevel, PictureClearance | undefined>
> = {
  flat: { off: undefined, soft: { side: 12, top: 12 }, strong: { side: 22, top: 22 } },
  soft: { off: { side: 8, top: 4 }, soft: { side: 14, top: 12 }, strong: { side: 22, top: 22 } },
  raised: { off: { side: 16, top: 6 }, soft: { side: 18, top: 14 }, strong: { side: 26, top: 22 } },
  floating: {
    off: { side: 28, top: 12 },
    soft: { side: 30, top: 18 },
    strong: { side: 34, top: 24 },
  },
}

/**
 * The room the picture's chosen depth needs, or undefined while there is none (nothing chosen, Flat with Glow
 * Off, or values the schema does not offer).
 */
export function pictureClearance(
  input: PictureDepthInput | null | undefined,
): PictureClearance | undefined {
  return PICTURE_CLEARANCE[shadowLevelOf(input?.shadow) ?? 'flat'][glowLevelOf(input?.glow)]
}

/**
 * Where that room goes in a slot that must keep its size: `side` on each side, `top` above, and the rest of the
 * slot's vertical padding below, so the picture keeps its ratio and the slot its height. `ratio` is the picture's
 * height over its width (1 for a square, 9/16 for a 16:9 picture): the padding a ratio-keeping inset adds is
 * twice the side's room times that ratio. A top that would not fit is cut back to what does.
 */
export function pictureInset({ side, top }: PictureClearance, ratio = 1) {
  const vertical = Math.round(2 * side * ratio)
  const above = Math.min(top, vertical)
  return { side, top: above, bottom: vertical - above }
}

/**
 * A framed picture's depth (Image + text, Hero, Team, Gallery, Testimonials, Location, Events, post
 * cards): the shared filter, from the picture's own `pictureDepthDesign`. There is no level above it, so the
 * site's Card depth never reaches a picture. Undefined while neither a shadow nor a glow is chosen, so
 * the picture is drawn exactly as it was; an unknown or legacy value is the same as unset.
 */
export function resolvePictureDepth(
  input: PictureDepthInput | null | undefined,
): ElementDepth | undefined {
  return depthFilter({
    level: shadowLevelOf(input?.shadow),
    glow: glowChoiceOf(input?.glow),
    glowColour: input?.glowColour,
  })
}

/**
 * Turns the Depth and glow box into what each element draws. Box elements are functions of the
 * shadow they draw on their own (`OWN_SHADOW`), kept when only a glow is set.
 */
export function resolveDepth(input: DepthInput | null | undefined): ResolvedDepth {
  const glow = glowLevelOf(input?.glow)
  const targets = glowTargetsOf(input?.glowTargets)
  const glowColour = input?.glowColour
  const glowFor = (target: GlowTarget): GlowLevel => (targets.includes(target) ? glow : 'off')

  const links = shadowLevelOf(input?.linkShadow)
  const social = shadowLevelOf(input?.socialShadow)
  const picture = shadowLevelOf(input?.pictureShadow)

  return {
    links: (own) => depthLook({ level: links, glow: glowFor('links'), glowColour }, own),
    social: (own) => depthLook({ level: social, glow: glowFor('social'), glowColour }, own),
    picture: depthFilter({ level: picture, glow: glowFor('picture'), glowColour }),
  }
}

export const LIFT_LEVELS = ['none', 'lift'] as const
export type LiftLevel = (typeof LIFT_LEVELS)[number]

export const LIFT_TITLES: Record<LiftLevel, string> = { none: 'None', lift: 'Lift' }

/** One level of a card's stored depth: an item's, then the section's Cards box. */
export interface CardDepthLevel {
  shadow?: string | null
  glow?: string | null
  glowColour?: ThemeColourInput | null
  lift?: string | null
}

/**
 * A card's depth. Each property comes from the first level that chose it (an item over its section's
 * Cards box); an empty property inherits, ending at the site's Card depth (`--card-depth`, through
 * `own`) and then the family's own shadow. `own` is one of `OWN_SHADOW.siteCard` or `siteCardFree`.
 * Undefined while nothing is chosen, so the family draws exactly what it did.
 */
export function resolveCardDepth(
  levels: readonly (CardDepthLevel | null | undefined)[],
  own: string,
): ElementDepth | undefined {
  const first = <T>(read: (level: CardDepthLevel) => T | undefined) => {
    for (const level of levels) {
      const value = level ? read(level) : undefined
      if (value !== undefined) return value
    }
    return undefined
  }
  const glow = first((level) => glowChoiceOf(level.glow))
  return depthLook(
    {
      level: first((level) => shadowLevelOf(level.shadow)),
      glow,
      glowColour: first((level) => {
        const colour = stegaClean(level.glowColour?.colour)
        return colour && colour !== 'inherit' ? level.glowColour : undefined
      }),
    },
    own,
  )
}

/**
 * Whether a card lifts under the pointer: the first level that chose None or Lift. Undefined while
 * nothing is chosen, which is "as the family draws it". The card must also be one link: a lift on a card
 * that goes nowhere promises something it can't do, so callers ask only of linked cards.
 */
export function resolveCardLift(
  levels: readonly (CardDepthLevel | null | undefined)[],
): LiftLevel | undefined {
  for (const level of levels) {
    const chosen = level ? pick(LIFT_LEVELS, level.lift) : undefined
    if (chosen) return chosen
  }
  return undefined
}
