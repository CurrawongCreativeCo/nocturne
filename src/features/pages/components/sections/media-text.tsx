import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { SectionFrame } from '@/components/ui/section-frame'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

export function MediaText({ data, isFirst }: SectionProps<'mediaText'>) {
  const { eyebrow, title, body, ctas, image, imagePosition } = data
  const imageFirst = stegaClean(imagePosition) === 'left'
  // Without an image, a two-column grid would squeeze the text into one half.
  const hasImage = Boolean(image?.asset)
  const defaults: SectionDefaults = {
    container: hasImage ? 'max-w-content' : 'max-w-measure',
    align: 'start',
  }
  const { tone, text, justify } = sectionTraits(data.style, defaults)

  return (
    <SectionFrame
      style={data.style}
      defaults={defaults}
      isFirst={isFirst}
      // Swap the columns on wide screens by order, so the text stays first in the reading order.
      media={
        <SanityImage
          image={image}
          width={1200}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="w-full rounded-card object-cover"
        />
      }
      containerClassName={`grid items-center gap-12 lg:gap-16 ${hasImage ? 'lg:grid-cols-2' : ''} ${imageFirst ? 'lg:[&>:first-child]:order-2 lg:[&>:last-child]:order-1' : ''}`}
    >
      <div className={text}>
        {eyebrow && (
          <p className="text-small font-semibold tracking-wide text-accent uppercase">{eyebrow}</p>
        )}
        <h2 className="mt-2 text-h2 font-semibold text-balance">{title}</h2>
        <RichText value={body} className="mt-4 text-lead text-ink-muted" />
        <CtaGroup ctas={ctas} surface={ctaSurfaceFor(tone)} className={`mt-8 ${justify}`} />
      </div>
    </SectionFrame>
  )
}
