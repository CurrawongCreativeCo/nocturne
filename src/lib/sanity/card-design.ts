import { stegaClean } from 'next-sanity'

import type { TextRole } from '@/lib/design/capabilities'

import type { MarkInput } from './decorative-mark-options'
import { layerDesign } from './design-overrides'
import { resolveSurface, type SurfaceDesign, type SurfaceInput } from './surface-options'
import { resolveTextRoles, type TextRolesInput } from './text-role'
import type { TextStyle } from './text-style-options'

/**
 * A card family's Cards box (task 156), as a query returns it: one fill and border, and the text roles
 * the family draws. Generalised from the Link list's: the same stored names at every level, so they layer
 * (design-overrides.ts). What a card draws with nothing chosen stays the family's own code.
 */
export type CardDesignInput<Role extends TextRole> = SurfaceInput &
  TextRolesInput<Role> & { mark?: MarkInput | null }

export interface CardDesign<Role extends TextRole> {
  surface: SurfaceDesign
  text: Record<Role, TextStyle>
}

export function resolveCardDesign<Role extends TextRole>(
  input: CardDesignInput<Role> | null | undefined,
  roles: readonly Role[],
): CardDesign<Role> {
  return { surface: resolveSurface(input), text: resolveTextRoles(input, roles) }
}

/** An item's own design (a plan's Appearance): the same fields as the card's, behind a switch. */
export type ItemDesignInput<Role extends TextRole> = CardDesignInput<Role> & {
  appearance?: string | null
  mark?: MarkInput | null
}

/**
 * The card the page draws for one item: the section's card design, with the item's own choices laid
 * over it one property at a time (design-overrides.ts), but only while the item is switched to
 * "Customise this card". A switched-off item keeps what it saved and the page ignores it.
 */
export function resolveItemCardDesign<Role extends TextRole>(
  section: CardDesignInput<Role> | null | undefined,
  item: ItemDesignInput<Role> | null | undefined,
  roles: readonly Role[],
): CardDesign<Role> {
  const base = resolveCardDesign(section, roles)
  if (!isCustomised(item)) return base
  const own = resolveCardDesign(item, roles)
  return {
    surface: layerDesign(base.surface, own.surface),
    text: Object.fromEntries(
      roles.map((role) => [role, layerDesign(base.text[role], own.text[role])]),
    ) as Record<Role, TextStyle>,
  }
}

export const isCustomised = (item: { appearance?: string | null } | null | undefined) =>
  stegaClean(item?.appearance) === 'custom'

/**
 * Which mark a card draws: a customised item's own, once it has chosen one (None included, which
 * removes the card's mark from that item), else the section's card mark. One mark per scope.
 */
export function cardMarkChoice(
  section: { mark?: MarkInput | null } | null | undefined,
  item: { appearance?: string | null; mark?: MarkInput | null } | null | undefined,
): { input: MarkInput | null | undefined; scope: 'card' | 'item' } {
  if (isCustomised(item) && stegaClean(item?.mark?.kind))
    return { input: item?.mark, scope: 'item' }
  return { input: section?.mark, scope: 'card' }
}
