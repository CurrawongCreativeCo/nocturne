import { StatFigure, type StatItemData } from './stat-figure'

interface Props {
  /** Two to four figures (the schema's `statsBar`); more still render, wrapping to further rows. */
  items: readonly StatItemData[]
  caption?: string | null
  /** Count the figures up when they scroll into view. Leave off where the section's animation is None. */
  animate?: boolean
  /** Centre the figures under a centred heading. */
  centred?: boolean
  className?: string
}

// Full class names so Tailwind's scanner sees them. The columns follow the bar's own width (container
// queries), not the screen's, so the same bar suits a full-width hero, a panel and a narrow column:
// three figures need about 32rem across, four about 42rem; narrower, they wrap two to a row.
const COLUMNS: Record<number, string> = {
  1: '',
  2: '',
  3: '@lg:grid-cols-3',
  4: '@2xl:grid-cols-4',
}

/**
 * A compact row of figures with no section around it, made to sit inside another section (the hero's
 * supporting slot, see the README's "Statistics" and "Adding a slot block"). It brings no colour of its
 * own: text, muted text and dividers all come from the tone it sits in, so it reads on a dark hero or a
 * light one.
 *
 * Every figure has a thin divider before it, and the row is pulled one gutter to the left inside an
 * `overflow-hidden` box, so the divider of the first figure in each row falls outside it and is cut off.
 * That puts dividers between figures only, however the row wraps, with no first/odd bookkeeping.
 */
export function StatsBar({
  items,
  caption,
  animate = false,
  centred = false,
  className = '',
}: Props) {
  if (items.length === 0) return null

  return (
    <div data-stats-bar className={`@container ${className}`.trim()}>
      <div className="overflow-hidden">
        <ul
          className={`-ms-4 grid grid-cols-2 gap-y-6 @lg:-ms-6 ${COLUMNS[Math.min(items.length, 4)] ?? COLUMNS[4]}`}
        >
          {items.map((item) => (
            <li
              key={item._key}
              className={`border-s border-line ps-4 @lg:ps-6 ${centred ? 'text-center' : ''}`}
            >
              <p>
                <StatFigure item={item} animate={animate} className="text-h3 font-semibold" />
              </p>
              <p className="mt-1 text-small text-ink-muted">{item.label}</p>
            </li>
          ))}
        </ul>
      </div>
      {caption && (
        <p className={`mt-4 text-small text-ink-muted ${centred ? 'text-center' : ''}`}>
          {caption}
        </p>
      )}
    </div>
  )
}
