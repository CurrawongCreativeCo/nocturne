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

export const decision = <Choice extends string>(
  field: string,
  choices: Record<Choice, SiteDecisionVars>,
): SiteDecision<Choice> => ({ field, choices })

/**
 * The decisions the site honours, by name. Empty until the tasks that own them register theirs:
 * density and shape (216b), Card depth (146). Each is one `decision(...)` entry here.
 */
export const SITE_DECISIONS = {} satisfies Readonly<Record<string, SiteDecision>>

export type SiteDecisionName = keyof typeof SITE_DECISIONS

/** The choices stored on Brand colours, as the settings query returns them. Empty until a decision is registered. */
// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type
export type SiteDecisionInput = Partial<Record<SiteDecisionName, string | null>>

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
