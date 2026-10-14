import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

export function MediaText({ data }: SectionProps<'mediaText'>) {
  const { eyebrow, title, body, ctas, image, imagePosition } = data
  const imageFirst = stegaClean(imagePosition) === 'left'
  // Without an image, a two-column grid would squeeze the text into one half.
  const hasImage = Boolean(image?.asset)

  return (
    <section
      className={`mx-auto grid items-center gap-12 px-gutter py-section lg:gap-16 ${hasImage ? 'max-w-content lg:grid-cols-2' : 'max-w-measure'}`}
    >
      <div className={imageFirst ? 'lg:order-2' : undefined}>
        {eyebrow && (
          <p className="text-small font-semibold tracking-wide text-accent uppercase">{eyebrow}</p>
        )}
        <h2 className="mt-2 text-h2 font-semibold text-balance">{title}</h2>
        <RichText value={body} className="mt-4 text-lead text-ink-muted" />
        <CtaGroup ctas={ctas} surface="light" className="mt-8" />
      </div>
      <SanityImage
        image={image}
        width={1200}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`w-full rounded-card object-cover ${imageFirst ? 'lg:order-1' : ''}`}
      />
    </section>
  )
}
