/**
 * Site-wide design decisions (build plan task 216): named choices, set once in Brand colours, that
 * restyle the whole site. Each choice maps to values for tokens that already exist in
 * `src/styles/tokens.json`, emitted as `:root` variables by `resolveDesignTokens`, so a section that
 * sets its own value still wins (tokens.json < these < section styles < component classes).
 *
 * Pure and Studio-free, so the site, Studio and tests can all import it. A decision is data: add one
 * to `SITE_DECISIONS` and `resolveDesignTokens` emits it, with nothing else to wire. Unset, an unknown
 * choice and the choice that equals today's look all emit nothing, so the site is exactly what
 * tokens.json defines until a different choice is made.
 */

/** CSS variable name → value, for the variables a choice changes. Empty means "as tokens.json". */
export type SiteDecisionVars = Readonly<Record<string, string>>

export interface SiteDecision<Choice extends string = string> {
  /** The Brand colours field (designSettings) that holds the choice. */
  readonly field: string
  /** Every choice and the variables it sets. The choice that matches tokens.json sets none. */
  readonly choices: Readonly<Record<Choice, SiteDecisionVars>>
}

const decision = <Choice extends string>(
  field: string,
  choices: Record<Choice, SiteDecisionVars>,
): SiteDecision<Choice> => ({ field, choices })

/**
 * How much room sections and the page edge leave. Section spacing (compact, default, spacious) stays
 * relative: a section's own choice still picks its step, and the steps move together.
 */
const density = decision('density', {
  compact: {
    '--spacing-section-compact': '2.5rem',
    '--spacing-section': '4rem',
    '--spacing-section-spacious': 'clamp(5rem, 1rem + 16vw, 8rem)',
    '--spacing-gutter': '1.25rem',
  },
  standard: {},
  airy: {
    '--spacing-section-compact': '5.5rem',
    '--spacing-section': '8rem',
    '--spacing-section-spacious': 'clamp(10rem, 3rem + 28vw, 15rem)',
    '--spacing-gutter': '2rem',
  },
})

/** How round corners are. `soft` is today's look. Buttons and pills follow the card's character. */
const shape = decision('shape', {
  sharp: {
    '--radius-sm': '0',
    '--radius-control': '0.125rem',
    '--radius-card': '0.125rem',
    '--radius-panel': '0.25rem',
    '--radius-button': '0.125rem',
    '--radius-pill': '0.125rem',
  },
  soft: {},
  round: {
    '--radius-sm': '0.5rem',
    '--radius-control': '1rem',
    '--radius-card': '1.75rem',
    '--radius-panel': '2.25rem',
  },
})

/** The decisions the site honours, by name. Task 146 adds Card depth here. */
export const SITE_DECISIONS = { density, shape } as const

export type SiteDecisionName = keyof typeof SITE_DECISIONS

/** The choices stored on Brand colours, as the settings query returns them. */
export type SiteDecisionInput = { [Name in SiteDecisionName]?: string | null }

/**
 * The variables for the chosen decisions, in registry order. A missing, empty or unrecognised choice
 * contributes nothing (a stale stored value falls back to tokens.json, never to a half-applied look).
 * Pass `decisions` to resolve against another registry, as the tests do.
 */
export function siteDecisionVars(
  input: Readonly<Record<string, unknown>> | null | undefined,
  decisions: Readonly<Record<string, SiteDecision>> = SITE_DECISIONS,
): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!input) return vars
  for (const { field, choices } of Object.values(decisions)) {
    const chosen = input[field]
    if (typeof chosen !== 'string' || !Object.hasOwn(choices, chosen)) continue
    Object.assign(vars, choices[chosen])
  }
  return vars
}
