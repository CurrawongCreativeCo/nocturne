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
  /**
   * Every choice and the variables it sets. A choice that matches today's look may set none (a layout
   * decision's default), or define a variable that is otherwise undefined, so "chosen" differs from
   * "unset" (Card depth's Soft sets `--card-depth`).
   */
  readonly choices: Readonly<Record<Choice, SiteDecisionVars>>
}

export const decision = <Choice extends string>(
  field: string,
  choices: Record<Choice, SiteDecisionVars>,
): SiteDecision<Choice> => ({ field, choices })

/**
 * How far cards lift off the page, site-wide (task 146). Sets `--card-depth`, which only card families
 * read (`CARD_SHADOW_CLASS`, lib/sanity/depth-options.ts), so `--shadow-card` and everything else that
 * uses it (social buttons) is untouched. Unset leaves the variable
 * undefined and each family draws what it always did; a section's or item's own choice wins over it.
 */
const cardDepth = decision('cardDepth', {
  flat: { '--card-depth': '0 0 #0000' },
  soft: { '--card-depth': 'var(--shadow-soft, var(--shadow-card))' },
  raised: { '--card-depth': 'var(--shadow-raised)' },
  floating: { '--card-depth': 'var(--shadow-floating)' },
})

/**
 * The decisions the site honours, by name. Density and shape (216b) register here too, each as one
 * `decision(...)` entry.
 */
export const SITE_DECISIONS = { cardDepth }

export type SiteDecisionName = keyof typeof SITE_DECISIONS

/** The choices stored on Brand colours, as the settings query returns them. */
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
