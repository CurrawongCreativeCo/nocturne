import type { CSSProperties } from 'react'

import type { TextRole } from '@/lib/design/capabilities'

import { swapClasses } from './swap-classes'
import {
  resolveTextStyle,
  textLook,
  type OwnText,
  type TextStyle,
  type TextStyleInput,
} from './text-style-options'
import { themeColourCss, type ThemeColourInput } from './theme-colour'

/**
 * A text role's element (task 156; README, "Design capability contract"): the family's own classes with
 * only the chosen properties replaced, and the marker evidence finds the element by. With nothing chosen
 * the classes are exactly `base`, so a family keeps its output when it adopts roles.
 */
export interface TextRoleProps {
  className: string
  style?: CSSProperties
  'data-text-role': TextRole
}

export function textRoleProps(
  role: TextRole,
  base: string,
  own: OwnText,
  style: TextStyle,
): TextRoleProps {
  const look = textLook(style, own)
  return {
    className: swapClasses(base, textLook({}, own).className, look.className),
    ...(look.style ? { style: look.style } : {}),
    'data-text-role': role,
  }
}

/** The stored fields of the roles a family offers, as a query returns them. */
export type TextRolesInput<Role extends TextRole> = Readonly<
  Partial<Record<Role, TextStyleInput | null>>
>

/** Each role's resolved layer: present properties only, so they can be layered (design-overrides.ts). */
export function resolveTextRoles<Role extends TextRole>(
  input: TextRolesInput<Role> | null | undefined,
  roles: readonly Role[],
): Record<Role, TextStyle> {
  return Object.fromEntries(roles.map((role) => [role, resolveTextStyle(input?.[role])])) as Record<
    Role,
    TextStyle
  >
}

/** How a role's highlight is stored, inside its text style. */
export interface HighlightStyleInput {
  colour?: ThemeColourInput | null
  weight?: string | null
  fontStyle?: string | null
}

const HIGHLIGHT_OWN = { size: 'text-body', weight: 'semibold' } as const

/**
 * A highlight's classes: the mark's own background goes, so with nothing chosen it reads as the
 * surrounding text in semibold, which stays readable on any surface. The size is always the role's own:
 * a highlight only changes colour, weight and style.
 */
export function highlightLook(input: HighlightStyleInput | null | undefined) {
  const style = resolveTextStyle({ weight: input?.weight, fontStyle: input?.fontStyle })
  const colour = themeColourCss(input?.colour)
  return {
    className: [
      'bg-transparent',
      colour ? '' : 'text-inherit',
      swapClasses(textLook(style, HIGHLIGHT_OWN).className, HIGHLIGHT_OWN.size, ''),
    ]
      .filter(Boolean)
      .join(' '),
    ...(colour ? { style: { color: colour } } : {}),
  }
}
