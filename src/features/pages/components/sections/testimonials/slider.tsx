import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'
import { LazySlider } from '@/components/ui/slider-lazy'

import { DEFAULTS } from './defaults'
import { TestimonialsHeader } from './header'
import { QuoteCard } from './quote-card'
import type { SectionProps } from '../../../types'

export function TestimonialsSlider({ data, isFirst }: SectionProps<'testimonials'>) {
  const { tone } = sectionTraits(data.style, DEFAULTS)
  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TestimonialsHeader data={data} />
      <LazySlider label="Customer testimonials" perView={{ base: 1, md: 2, lg: 3 }} gap>
        {data.items.map((item) => (
          <QuoteCard
            key={item._key}
            item={item}
            avatarDesign={data.avatarDesign}
            cardDesign={data.cardDesign}
            tone={tone}
          />
        ))}
      </LazySlider>
    </SectionFrame>
  )
}
