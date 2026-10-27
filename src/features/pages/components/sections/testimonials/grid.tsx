import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import { QuoteCard } from './quote-card'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
export const DEFAULTS: SectionDefaults = {
  tone: 'alt',
  container: 'max-w-content',
  align: 'center',
}

export function TestimonialsGrid({ data, isFirst }: SectionProps<'testimonials'>) {
  const { title, items } = data
  const { block, text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {title && (
        <h2
          className={`mb-16 max-w-measure-narrow text-h2 font-semibold text-balance ${block} ${text}`}
        >
          {title}
        </h2>
      )}
      <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item._key}>
            <QuoteCard item={item} design={data.avatarDesign} />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
