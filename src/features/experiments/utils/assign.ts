import type { Experiment } from '../types'

/** The option that shows the content as published, with no Sanity variant. */
export const CONTROL = 'control'

/** Sanity variant ids are bare names: letters, numbers, "-" and "_" (next-sanity rejects the rest). */
export const VARIANT_ID_PATTERN = /^[A-Za-z0-9_-]+$/

/** Name of the sticky assignment cookie. Its value is "<experiment id>.<option>". */
export const EXPERIMENT_COOKIE = 'ab'
export const EXPERIMENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 90

/** Every option a visitor can land in, control first. */
export function experimentOptions(experiment: Experiment) {
  return [
    { id: CONTROL, weight: experiment.controlWeight },
    ...experiment.variants.map(({ id, weight }) => ({ id, weight })),
  ]
}

/**
 * Picks an option by weight. `random` is a number in [0, 1), e.g. Math.random(). With no
 * traffic anywhere the visitor gets control.
 */
export function chooseOption(experiment: Experiment, random: number): string {
  const options = experimentOptions(experiment).filter(({ weight }) => weight > 0)
  const total = options.reduce((sum, { weight }) => sum + weight, 0)
  if (total <= 0) return CONTROL

  let point = random * total
  for (const { id, weight } of options) {
    if (point < weight) return id
    point -= weight
  }
  return options.at(-1)?.id ?? CONTROL
}

export function formatCookie(experiment: Experiment, option: string): string {
  return `${experiment._id}.${option}`
}

/**
 * The option a visitor's cookie holds, or null when it is missing, belongs to another
 * experiment, or names an option that no longer exists (so they are assigned again).
 */
export function readCookie(experiment: Experiment, value: string | undefined): string | null {
  const prefix = `${experiment._id}.`
  if (!value?.startsWith(prefix)) return null
  const option = value.slice(prefix.length)
  return experimentOptions(experiment).some(({ id }) => id === option) ? option : null
}

/** The Sanity variant to fetch for an option: control reads the published content. */
export function optionToVariant(option: string): string | undefined {
  return option === CONTROL ? undefined : option
}

/** Crawlers always see control, so search results never flip between variants. */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|lighthouse/i.test(
    userAgent ?? '',
  )
}
