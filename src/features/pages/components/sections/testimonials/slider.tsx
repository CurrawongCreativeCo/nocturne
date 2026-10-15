import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'
import { LazySlider } from '@/components/ui/slider-lazy'

import { DEFAULTS } from './grid'
import { QuoteCard } from './quote-card'
import type { SectionProps } from '../../../types'

export function TestimonialsSlider({ data, isFirst }: SectionProps<'testimonials'>) {
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
      <LazySlider label="Customer testimonials" perView={{ base: 1, md: 2, lg: 3 }} gap>
        {items.map((item) => (
          <QuoteCard key={item._key} item={item} />
        ))}
      </LazySlider>
    </SectionFrame>
  )
}
