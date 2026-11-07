import type { TextRole } from '@/lib/design/capabilities'

import { resolveSurface, type SurfaceDesign, type SurfaceInput } from './surface-options'
import { resolveTextRoles, type TextRolesInput } from './text-role'
import type { TextStyle } from './text-style-options'

/**
 * A card family's Cards box (task 156), as a query returns it: one fill and border, and the text roles
 * the family draws. Generalised from the Link list's: the same stored names at every level, so they layer
 * (design-overrides.ts). What a card draws with nothing chosen stays the family's own code.
 */
export type CardDesignInput<Role extends TextRole> = SurfaceInput & TextRolesInput<Role>

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
