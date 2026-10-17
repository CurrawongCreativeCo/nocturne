import { colorHex } from '@/config/tokens.generated'

import { resolveDesignTokens, type DesignOverrides } from './resolve-design-tokens'

/** The role each Brand colours field paints (Primary is the accent role; see README, Colour systems). */
const ROLE: Readonly<Record<string, keyof typeof colorHex>> = {
  primary: 'accent',
  secondary: 'accent2',
  highlight: 'highlight',
  surface: 'surface',
  surfaceAlt: 'surfaceAlt',
  surfaceInverse: 'surfaceInverse',
  ink: 'ink',
  inkMuted: 'inkMuted',
  line: 'line',
}

/**
 * The colour a Brand colours field shows when it is empty: what the site really uses for it, given the
 * other settings (so a dark Appearance gives the dark defaults). Null for fields that are not colour roles.
 */
export function defaultColour(
  field: string | null,
  document: DesignOverrides | null | undefined,
): string | null {
  const role = field ? ROLE[field] : undefined
  if (!field || !role) return null
  return resolveDesignTokens({ ...document, [field]: null }).colours[role]
}
