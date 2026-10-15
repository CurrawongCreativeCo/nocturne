import { StatFigure, type StatItemData } from './stat-figure'

interface Props {
  /** Two to four figures (the schema's `statsBar`); more still render, wrapping to further rows. */
  items: readonly StatItemData[]
  caption?: string | null
  /** Count the figures up when they scroll into view. Leave off where the section's animation is None. */
  animate?: boolean
  className?: string
}

// Full class names so Tailwind's scanner sees them.
const COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

/**
 * A compact row of figures with no section around it, made to sit inside another section (the hero's
 * statistics slot, see the README's "Statistics"). It brings no colour of its own: text, muted text
 * and dividers all come from the tone it sits in, so it reads on a dark hero or a light one. Thin
 * dividers sit between the figures; on a phone they wrap two to a row, with the divider only between
 * the two in a row.
 */
export function StatsBar({ items, caption, animate = false, className = '' }: Props) {
  if (items.length === 0) return null

  return (
    <div data-stats-bar className={className}>
      <ul
        className={`grid grid-cols-2 gap-y-6 ${COLUMNS[Math.min(items.length, 4)] ?? COLUMNS[4]}`}
      >
        {items.map((item) => (
          <li
            key={item._key}
            className="border-s border-line px-4 first:border-s-0 first:ps-0 max-sm:odd:border-s-0 max-sm:odd:ps-0 sm:px-6"
          >
            <p>
              <StatFigure item={item} animate={animate} className="text-h3 font-semibold" />
            </p>
            <p className="mt-1 text-small text-ink-muted">{item.label}</p>
          </li>
        ))}
      </ul>
      {caption && <p className="mt-4 text-small text-ink-muted">{caption}</p>}
    </div>
  )
}
