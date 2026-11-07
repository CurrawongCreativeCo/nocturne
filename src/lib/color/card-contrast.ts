import { TEXT_ROLES, type TextRole } from '@/lib/design/capabilities'

import type { GlassStrength } from './glass-contrast'
import type { ColourSet } from './heading-contrast'
import {
  layeredSurface,
  surfaceForegroundHex,
  surfaceTextContrast,
  type StoredColour,
  type StoredSurface,
  type SurfaceContrast,
} from './surface-contrast'
import { themeColourHex } from './theme-colour-contrast'

/**
 * Contrast for any card family (task 156): one level's stored surface and text roles, for a section's
 * Cards box and for one item alike, so no section needs a lookup of its own.
 */
export interface StoredCardSurface extends Omit<StoredSurface, 'foreground'> {
  label?: { colour?: StoredColour | null } | null
}

export function cardSurface(surface: StoredCardSurface | null | undefined): StoredSurface {
  return {
    background: surface?.background,
    backgroundStrength: surface?.backgroundStrength,
    foreground: surface?.label?.colour,
  }
}

export function layeredCardSurface(
  list: StoredCardSurface | null | undefined,
  card: StoredCardSurface | null | undefined,
): StoredCardSurface {
  const surface = layeredSurface(cardSurface(list), cardSurface(card))
  return {
    background: surface.background,
    backgroundStrength: surface.backgroundStrength,
    label: { colour: surface.foreground },
  }
}

export function cardTextContrast(
  input: Omit<Parameters<typeof surfaceTextContrast>[0], 'surface'> & {
    surface: StoredCardSurface
  },
) {
  return surfaceTextContrast({ ...input, surface: cardSurface(input.surface) })
}

export function cardLabelHex(
  surface: StoredCardSurface,
  tone: string | null | undefined,
  site?: ColourSet,
): string {
  return surfaceForegroundHex(cardSurface(surface), tone, site)
}

/** A card's stored design at one level: its fill and each text role's colour. */
export type StoredCardLevel = Omit<StoredSurface, 'foreground'> &
  Partial<Record<TextRole, { colour?: StoredColour | null } | null>>

/** The colour one role ends up with across the levels, least specific first, if any chose. */
const chosenFor = (
  role: TextRole,
  levels: readonly (StoredCardLevel | null | undefined)[],
): StoredColour | undefined =>
  levels
    .map((level) => level?.[role]?.colour)
    .filter((colour) => colour?.colour && colour.colour !== 'inherit')
    .at(-1) ?? undefined

/** The colour each text role ends up with across the levels, for those that chose. */
export function chosenTextColours(
  ...levels: readonly (StoredCardLevel | null | undefined)[]
): StoredColour[] {
  return TEXT_ROLES.flatMap((role) => {
    const chosen = chosenFor(role, levels)
    return chosen ? [chosen] : []
  })
}

/** Which of the tone's text colours a family draws each role in while none is chosen. */
export type RoleDefaultColours = Readonly<Partial<Record<TextRole, 'ink' | 'muted'>>>

/**
 * The lowest contrast any of a card's text gets on the background its levels choose: each role in its
 * chosen colour, else the colour the family draws it in. Null when no level chooses a background: the
 * family's own surface is its own promise.
 */
export function worstCardTextContrast({
  levels,
  defaults,
  roles = TEXT_ROLES,
  tone,
  glass = null,
  site,
}: {
  levels: readonly (StoredCardLevel | null | undefined)[]
  defaults: RoleDefaultColours
  /** The roles to measure, for a family whose warning names one (a Link list's label). */
  roles?: readonly TextRole[]
  tone: string | null | undefined
  glass?: GlassStrength | null
  site?: ColourSet
}): SurfaceContrast | null {
  const surface = levels.reduce<StoredSurface>((under, level) => layeredSurface(under, level), {})
  const hexes = roles
    .map((role) => {
      const chosen = chosenFor(role, levels)
      if (chosen) return themeColourHex(chosen.colour, chosen.hex, tone, site)
      const own = defaults[role]
      return own ? themeColourHex(own, null, tone, site) : null
    })
    .filter((hex): hex is string => Boolean(hex))
  const results = hexes
    .map((foreground) => surfaceTextContrast({ foreground, surface, tone, glass, site }))
    .filter((result): result is SurfaceContrast => result !== null)
  return results.length > 0 ? results.reduce((a, b) => (b.ratio < a.ratio ? b : a)) : null
}
