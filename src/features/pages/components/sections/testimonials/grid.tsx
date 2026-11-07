import { SectionFrame } from '@/components/ui/section-frame'

import { DEFAULTS } from './defaults'
import { TestimonialsHeader } from './header'
import { QuoteCard } from './quote-card'
import type { SectionProps } from '../../../types'

export function TestimonialsGrid({ data, isFirst }: SectionProps<'testimonials'>) {
  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TestimonialsHeader data={data} />
      <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <li key={item._key}>
            <QuoteCard item={item} avatarDesign={data.avatarDesign} cardDesign={data.cardDesign} />
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
