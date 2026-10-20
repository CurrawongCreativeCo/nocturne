import { stegaClean } from 'next-sanity'

import { shadowLevelOf, type ShadowLevel } from '@/lib/sanity/depth-options'
import { layerDesign } from '@/lib/sanity/design-overrides'
import { LINK_ARROWS, type LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import {
  ICON_COLOUR_CHOICES,
  resolveIconDesign,
  resolveSurface,
  type IconDesign,
  type IconDesignInput,
  type SurfaceDesign,
  type SurfaceInput,
} from '@/lib/sanity/surface-options'
import {
  resolveTextStyle,
  type TextStyle,
  type TextStyleInput,
} from '@/lib/sanity/text-style-options'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from '@/lib/sanity/theme-colour'

/**
 * A Link list card's look, layered (lib/sanity/design-overrides.ts): the layout's own (its preset),
 * then the list's Design tab (Cards, Arrows and icons, Depth and glow › Link shadow), then the card's
 * own Appearance when it is set to "Customise this card". Each property is layered on its own, so a
 * card that only changes its border keeps every other setting of the list.
 */

/** The stored fields, as the query returns them for the list (flattened) and for one card. */
export interface LinkCardDesignInput extends SurfaceInput, IconDesignInput {
  eyebrow?: TextStyleInput | null
  label?: TextStyleInput | null
  description?: TextStyleInput | null
  /** A shadow level (the list's is Depth and glow › Link shadow). */
  shadow?: string | null
  arrowStyle?: string | null
  arrowColour?: ThemeColourInput | null
}

/** One card's design, or the list's: every property present only when chosen. */
export interface LinkCardDesign {
  surface: SurfaceDesign
  eyebrow: TextStyle
  label: TextStyle
  description: TextStyle
  icon: IconDesign
  shadow?: ShadowLevel
  arrow?: LinkArrowStyle
  arrowColour?: string
}

const ARROW_COLOURS: readonly ThemeColour[] = ['inherit', ...ICON_COLOUR_CHOICES, 'custom']

/** A layer from stored fields; unset and unknown values are left out (they inherit). */
export function resolveLinkCardDesign(
  input: LinkCardDesignInput | null | undefined,
): LinkCardDesign {
  const design: LinkCardDesign = {
    surface: resolveSurface(input),
    eyebrow: resolveTextStyle(input?.eyebrow),
    label: resolveTextStyle(input?.label),
    description: resolveTextStyle(input?.description),
    icon: resolveIconDesign(input),
  }
  const shadow = shadowLevelOf(input?.shadow)
  if (shadow !== undefined) design.shadow = shadow
  const arrow = LINK_ARROWS.find((option) => option === stegaClean(input?.arrowStyle))
  if (arrow !== undefined) design.arrow = arrow
  const arrowColour = themeColourCss(input?.arrowColour, ARROW_COLOURS)
  if (arrowColour !== undefined) design.arrowColour = arrowColour
  return design
}

/** `card` over `list`, one property at a time. */
export function layerLinkCardDesign(list: LinkCardDesign, card: LinkCardDesign): LinkCardDesign {
  const top = layerDesign<Pick<LinkCardDesign, 'shadow' | 'arrow' | 'arrowColour'>>(
    { shadow: list.shadow, arrow: list.arrow, arrowColour: list.arrowColour },
    { shadow: card.shadow, arrow: card.arrow, arrowColour: card.arrowColour },
  )
  return {
    surface: layerDesign(list.surface, card.surface),
    eyebrow: layerDesign(list.eyebrow, card.eyebrow),
    label: layerDesign(list.label, card.label),
    description: layerDesign(list.description, card.description),
    icon: layerDesign(list.icon, card.icon),
    ...top,
  }
}

/** A card's Appearance switch: only "Customise this card" applies its overrides. */
export const CARD_APPEARANCES = ['inherit', 'custom'] as const

/** The card's overrides, or nothing while it uses the list's design (whatever is stored). */
export function cardOverrides<T extends { appearance?: string | null }>(
  design: T | null | undefined,
): T | undefined {
  return stegaClean(design?.appearance) === 'custom' ? (design ?? undefined) : undefined
}

/** The list's Design tab, flattened into one card layer. */
export function listCardDesignInput(data: {
  cardDesign?:
    (SurfaceInput & Pick<LinkCardDesignInput, 'eyebrow' | 'label' | 'description'>) | null
  linkDesign?: (IconDesignInput & Pick<LinkCardDesignInput, 'arrowStyle' | 'arrowColour'>) | null
  depthDesign?: { linkShadow?: string | null } | null
}): LinkCardDesignInput {
  return {
    ...data.cardDesign,
    ...data.linkDesign,
    shadow: data.depthDesign?.linkShadow,
  }
}
