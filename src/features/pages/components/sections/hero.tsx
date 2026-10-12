import { CtaGroup } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

/**
 * `data` is SectionOf<'hero'>: the exact projection of `heroFragment`, generated
 * by TypeGen. Nullable fields are typed nullable — the compiler enforces fallbacks.
 */
export function Hero({ data, isFirst = false }: SectionProps<'hero'>) {
  const { title, description, ctas, backgroundImage } = data
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'

  return (
    <section className="relative isolate overflow-hidden bg-gray-950 text-white">
      <SanityImage
        image={backgroundImage}
        fill
        preload={isFirst}
        sizes="100vw"
        className="-z-10 object-cover opacity-40"
      />
      <div className="mx-auto max-w-4xl px-6 py-32 text-center sm:py-48">
        <Heading className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {title}
        </Heading>
        {description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-gray-300">{description}</p>
        )}
        <CtaGroup ctas={ctas} className="mt-10 justify-center" />
      </div>
    </section>
  )
}
