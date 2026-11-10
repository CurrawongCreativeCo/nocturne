import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits } from '@/components/ui/section-style'
import { LazySlider } from '@/components/ui/slider-lazy'
import { resolvePictureDepth } from '@/lib/sanity/depth-options'

import { DEFAULTS } from './defaults'
import { TestimonialsHeader } from './header'
import { QuoteCard } from './quote-card'
import type { SectionProps } from '../../../types'

export function TestimonialsSlider({ data, isFirst }: SectionProps<'testimonials'>) {
  const { tone } = sectionTraits(data.style, DEFAULTS)
  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <TestimonialsHeader data={data} />
      <LazySlider
        label="Customer testimonials"
        perView={{ base: 1, md: 2, lg: 3 }}
        gap
        // An avatar's shadow reaches below its card; only a slider that has one asks for the room.
        bleed={Boolean(resolvePictureDepth(data.pictureDepthDesign))}
      >
        {data.items.map((item) => (
          <QuoteCard
            key={item._key}
            item={item}
            avatarDesign={data.avatarDesign}
            pictureDepth={data.pictureDepthDesign}
            cardDesign={data.cardDesign}
            tone={tone}
          />
        ))}
      </LazySlider>
    </SectionFrame>
  )
}
