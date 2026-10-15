/**
 * Where a hero layout puts its supporting slot (README, "Adding a hero slot"):
 *
 * - `below-buttons`: under the buttons, inside the text block (Full background, Split).
 * - `beside-text`: in a column beside the text from `lg` up, below it on a phone (Editorial).
 * - `in-panel`: under the buttons, inside the text panel (Image with panel).
 *
 * Each layout asks `<HeroSlot placement>` for the spot it has; the slot renders only where this map
 * says it goes, so a layout and the map cannot disagree about where the slot is.
 */
export type HeroSlotPlacement = 'below-buttons' | 'beside-text' | 'in-panel'

/** Layout (the hero's `variant`) -> placement. A new layout adds a line (hero-slot.test.ts checks). */
export const HERO_SLOT_PLACEMENT = {
  overlay: 'below-buttons',
  split: 'below-buttons',
  editorial: 'beside-text',
  'full-bleed': 'in-panel',
} as const satisfies Record<string, HeroSlotPlacement>

const DEFAULT_PLACEMENT: HeroSlotPlacement = HERO_SLOT_PLACEMENT.overlay

/** The placement for a stored `variant`; unset or unknown ones get the default layout's, as the hero does. */
export function heroSlotPlacement(variant: string | null | undefined): HeroSlotPlacement {
  return (
    (HERO_SLOT_PLACEMENT as Record<string, HeroSlotPlacement | undefined>)[variant ?? ''] ??
    DEFAULT_PLACEMENT
  )
}

/** Space between the text above and the slot, per placement. Beside the text, the grid's gap does it. */
export const HERO_SLOT_SPACING: Record<HeroSlotPlacement, string> = {
  'below-buttons': 'mt-12',
  'in-panel': 'mt-8 border-t border-line pt-6',
  'beside-text': '',
}
