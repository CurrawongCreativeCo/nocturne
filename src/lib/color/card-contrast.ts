import type { ColourSet } from './heading-contrast'
import {
  layeredSurface,
  surfaceForegroundHex,
  surfaceTextContrast,
  type StoredColour,
  type StoredSurface,
} from './surface-contrast'

/** Link list schema adapter. Surface calculations stay reusable by other sections. */
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
