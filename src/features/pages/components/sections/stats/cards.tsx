import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { StatFigure } from '@/components/ui/stat-figure'

import type { SectionProps } from '../../../types'

// Full class names so Tailwind's scanner sees them. Three is the design's sweet spot; four and six
// fill the row, five sits in threes.
const columnClasses: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3',
  6: 'sm:grid-cols-2 lg:grid-cols-3',
}

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center', motion: 'reveal' }

export function StatsCards({ data, isFirst }: SectionProps<'stats'>) {
  const { title, intro, items } = data
  const { block, text, align, motion } = sectionTraits(data.style, DEFAULTS)
  const animate = motion !== 'none' && !isFirst

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {(title || intro) && (
        <header className={`mb-16 max-w-measure-narrow ${block} ${text}`}>
          {title && <h2 className="text-h2 font-semibold text-balance">{title}</h2>}
          {intro && <p className="mt-4 text-lead text-pretty text-ink-muted">{intro}</p>}
        </header>
      )}
      <ul
        className={`grid grid-cols-1 gap-6 ${columnClasses[Math.min(items.length, 6)] ?? columnClasses[6]}`}
      >
        {items.map((item) => (
          <li
            key={item._key}
            className={`rounded-card border-t-4 border-accent bg-surface-alt p-8 ring-1 ring-line ${align === 'center' ? 'text-center' : ''}`}
          >
            <p>
              <StatFigure item={item} animate={animate} className="text-h1 font-semibold" />
            </p>
            <p className="mt-2 text-lead text-ink-muted">{item.label}</p>
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
