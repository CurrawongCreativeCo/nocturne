/** Statistics are written for an Australian audience: 12,500 and 4.9, grouped with commas. */
const LOCALE = 'en-AU'

/** The most decimal places an editor can ask for; a headline figure never needs more. */
export const MAX_STAT_DECIMALS = 3

/** The parts of a `statItem` (schema: lib/sanity/schema/stats.ts) that make up its figure. */
export interface StatFigure {
  value: number
  decimals?: number | null
  prefix?: string | null
  suffix?: string | null
}

const formatters = new Map<number, Intl.NumberFormat>()

/** Whole numbers from 0 to MAX_STAT_DECIMALS; anything else (unset, 2.5, 9) is brought into range. */
export function statDecimals(decimals: number | null | undefined): number {
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) return 0
  return Math.min(MAX_STAT_DECIMALS, Math.max(0, Math.round(decimals)))
}

/**
 * The figure as it is shown: grouped with `Intl.NumberFormat('en-AU')`, with exactly `decimals`
 * places so a counting number never changes width because a trailing zero was dropped, then the
 * prefix and suffix ("$" 1.2 "m", 98 "%"). Pass `value` to format a step on the way to the figure.
 */
export function formatStat(stat: StatFigure, value: number = stat.value): string {
  const decimals = statDecimals(stat.decimals)
  let formatter = formatters.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatters.set(decimals, formatter)
  }
  return `${stat.prefix ?? ''}${formatter.format(value)}${stat.suffix ?? ''}`
}

/**
 * The width a figure needs, in `ch` (the width of a "0"), for `min-width`. Digits are the same
 * width in a tabular-nums font, so a count that starts at "0" and grows to "12,500" is already
 * reserved the room it will end up needing, and nothing around it moves.
 */
export function statWidthCh(stat: StatFigure): number {
  return formatStat(stat).length
}
