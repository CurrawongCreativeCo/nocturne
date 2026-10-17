import {
  resolveDesignTokens,
  type BaseColours,
  type DesignOverrides,
} from './resolve-design-tokens'

/** The Brand colours fields that hold a single colour, and the resolved token each one stands for. */
const FIELD_TOKENS = {
  primary: 'accent',
  secondary: 'accent2',
  highlight: 'highlight',
  surface: 'surface',
  surfaceAlt: 'surfaceAlt',
  surfaceInverse: 'surfaceInverse',
  ink: 'ink',
  inkMuted: 'inkMuted',
  line: 'line',
} as const satisfies Record<string, keyof BaseColours>

/**
 * The colour the site uses for `field` while it is empty: the resolved value with that field left
 * out, so the other settings (such as a dark Appearance) still apply. Null for fields with no
 * single default (gradient stops).
 */
export function defaultColourFor(
  field: string | null,
  document: DesignOverrides | null | undefined,
): string | null {
  if (!field || !Object.hasOwn(FIELD_TOKENS, field)) return null
  const token = FIELD_TOKENS[field as keyof typeof FIELD_TOKENS]
  return resolveDesignTokens({ ...document, [field]: null }).colours[token]
}
