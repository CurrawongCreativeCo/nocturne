import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { StatFigure } from '@/components/ui/stat-figure'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'center', motion: 'reveal' }

export function StatsInline({ data, isFirst }: SectionProps<'stats'>) {
  const { heading, intro, items } = data
  const title = sectionTitle(data)
  const { block, text, align, motion } = sectionTraits(data.style, DEFAULTS)
  // The first section never animates (SectionFrame), and Animation "None" means no count-up.
  const animate = motion !== 'none' && !isFirst

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {(title || intro) && (
        <header className={`mb-16 max-w-measure-narrow ${block} ${text}`}>
          {title && (
            <RichHeading
              as="h2"
              blocks={heading}
              fallback={title}
              className="text-h2 font-semibold text-balance"
            />
          )}
          {intro && <p className="mt-4 text-lead text-pretty text-ink-muted">{intro}</p>}
        </header>
      )}
      <ul
        className={`flex flex-wrap gap-x-16 gap-y-12 ${align === 'center' ? 'justify-center text-center' : ''}`}
      >
        {items.map((item) => (
          <li key={item._key} className="min-w-36">
            <p>
              <StatFigure
                item={item}
                animate={animate}
                className="font-display text-display font-semibold"
              />
            </p>
            <p className="mt-2 text-lead text-ink-muted">{item.label}</p>
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
