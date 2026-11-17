import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { LazyCountUp } from '@/components/motion/count-up-lazy'
import type { TextRole } from '@/lib/design/capabilities'
import { formatStat, statWidthCh, type StatFigure as Figure } from '@/lib/stats/format-stat'

/** A `statItem` as a query returns it (fragment: `statItemFields`). */
export interface StatItemData {
  _key: string
  value: number
  label: string
  decimals?: number | null
  prefix?: string | null
  suffix?: string | null
}

/** The figure's parts without edit markers (draft mode), which would end up in the number's text. */
export function cleanFigure(item: StatItemData): Figure {
  return {
    value: item.value,
    decimals: item.decimals,
    prefix: stegaClean(item.prefix),
    suffix: stegaClean(item.suffix),
  }
}

interface Props {
  item: StatItemData
  /** Count up from 0 when the figure scrolls into view. Off: it is plain text. */
  animate?: boolean
  /** Type size and weight, e.g. `text-h1 font-semibold`. */
  className?: string
  style?: CSSProperties
  /** The text role this figure draws (lib/design/capabilities.ts). */
  textRole?: TextRole
}

/**
 * One figure, formatted on the server (`en-AU`) so the real number is in the HTML for search
 * engines, for visitors without JavaScript and under reduced motion.
 *
 * Animated, the counting text is `aria-hidden` and a visually hidden span holds the final value, so
 * a screen reader hears "12,500+" once and never "0, 3, 41...". `tabular-nums` and a `min-width` of
 * the final text's width keep the box the same size from the first frame to the last, so the count
 * causes no layout shift. The counting code is a separate chunk (see LazyCountUp), downloaded only
 * by pages that render an animated figure.
 */
export function StatFigure({ item, animate = false, className = '', style, textRole }: Props) {
  const figure = cleanFigure(item)
  const final = formatStat(figure)
  const base = `inline-block tabular-nums ${className}`.trim()

  if (!animate) {
    return (
      <span className={base} style={style} data-text-role={textRole}>
        {final}
      </span>
    )
  }

  return (
    <span
      className={`${base} relative`}
      style={{ ...style, minWidth: `${statWidthCh(figure)}ch` }}
      data-text-role={textRole}
    >
      <span className="sr-only">{final}</span>
      <span aria-hidden="true">
        <LazyCountUp stat={figure} final={final} />
      </span>
    </span>
  )
}
