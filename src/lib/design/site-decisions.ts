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

import { HEADING_STYLES, headingStyleVariables } from './heading-styles'

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
 * How much room the site gives its sections (task 216). Moves only `--spacing-section`, the vertical
 * padding of a section left on Default (and one with no choice at all, which resolves to Default), and
 * `--spacing-gutter`. A section that explicitly chose Compact or Spacious reads
 * `--spacing-section-compact` or `-spacious`, which no density touches, so its own choice wins.
 * Compact is 75% and Airy 125% of tokens.json (6rem and 1.5rem); Standard is today's values, so it
 * emits nothing.
 */
const density = decision('density', {
  compact: { '--spacing-section': '4.5rem', '--spacing-gutter': '1.125rem' },
  standard: {},
  airy: { '--spacing-section': '7.5rem', '--spacing-gutter': '1.875rem' },
})

/**
 * How rounded the site's cards, panels and controls are (task 216). Buttons and pills stay fully
 * round, as the Button's own shape does. Soft is today's look (1rem, 1.5rem and 0.5rem), so it emits
 * nothing.
 */
const shape = decision('shape', {
  sharp: { '--radius-card': '0.25rem', '--radius-panel': '0.5rem', '--radius-control': '0.25rem' },
  soft: {},
  round: { '--radius-card': '1.75rem', '--radius-panel': '2.25rem', '--radius-control': '0.75rem' },
})

/**
 * How the headings look, site-wide (task 216, provisional): size, letter spacing and weight, from the
 * one table in heading-styles.ts. Standard, unset and an unknown choice emit nothing. `--heading-weight`
 * is read by one rule in globals.css that falls back to each heading's own weight while it is undefined.
 */
const headingStyle = decision('headingStyle', {
  standard: {},
  editorial: headingStyleVariables(HEADING_STYLES.editorial),
  modern: headingStyleVariables(HEADING_STYLES.modern),
  classic: headingStyleVariables(HEADING_STYLES.classic),
})

/**
 * The main button's shadow (task 148). Sets `--button-depth`, which only buttons read, so `--shadow-*`
 * and every card are untouched. Flat is today's look and emits nothing. Soft and Raised reuse the
 * card shadow levels (tokens.json), so the two stay one scale.
 */
const buttonDepth = decision('buttonDepth', {
  flat: {},
  soft: { '--button-depth': 'var(--shadow-soft, var(--shadow-card))' },
  raised: { '--button-depth': 'var(--shadow-raised)' },
})

/**
 * The main button's glow (task 148): the halo size and strength of Task 146's glow tokens, in the
 * Primary colour (`--color-accent`, 146's default). Sets `--button-glow`; the secondary button never
 * reads it. Off is today's look and emits nothing.
 */
const glowOf = (level: 'soft' | 'strong') =>
  `var(--depth-glow-${level}) color-mix(in oklch, var(--color-accent) var(--depth-glow-${level}-strength), transparent)`

const buttonGlow = decision('buttonGlow', {
  off: {},
  soft: { '--button-glow': glowOf('soft') },
  strong: { '--button-glow': glowOf('strong') },
})

/**
 * The secondary button's style (task 148). Soft fill swaps the outline for a tint of the button's own
 * text colour (`currentcolor`, so it follows every section's tone, which a `:root` variable would
 * not). Outline is today's look and emits nothing.
 */
const secondaryButton = decision('secondaryButton', {
  outline: {},
  soft: {
    '--button-secondary-fill': 'color-mix(in oklch, currentcolor 10%, transparent)',
    '--button-secondary-fill-hover': 'color-mix(in oklch, currentcolor 18%, transparent)',
    '--button-secondary-ring': 'transparent',
  },
})

/** The decisions the site honours, by name. */
export const SITE_DECISIONS = {
  density,
  shape,
  headingStyle,
  cardDepth,
  buttonDepth,
  buttonGlow,
  secondaryButton,
}

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
