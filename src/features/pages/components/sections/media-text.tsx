import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

export function MediaText({ data }: SectionProps<'mediaText'>) {
  const { eyebrow, title, body, ctas, image, imagePosition } = data
  const imageFirst = stegaClean(imagePosition) === 'left'

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
      <div className={imageFirst ? 'lg:order-2' : undefined}>
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand uppercase">{eyebrow}</p>}
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
        <RichText value={body} className="mt-4 text-lg text-gray-600" />
        <CtaGroup ctas={ctas} surface="light" className="mt-8" />
      </div>
      <SanityImage
        image={image}
        width={1200}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`w-full rounded-2xl object-cover ${imageFirst ? 'lg:order-1' : ''}`}
      />
    </section>
  )
}
