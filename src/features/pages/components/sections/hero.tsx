import { CtaGroup } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'
import type { SectionProps } from '../../types'

/**
 * `data` is SectionOf<'hero'>: the exact projection of `heroFragment`, generated
 * by TypeGen. Nullable fields are typed nullable — the compiler enforces fallbacks.
 */
export function Hero({ data }: SectionProps<'hero'>) {
  const { title, description, ctas, backgroundImage } = data

  return (
    <section className="relative isolate overflow-hidden bg-gray-950 text-white">
      <SanityImage
        image={backgroundImage}
        fill
        preload
        sizes="100vw"
        className="-z-10 object-cover opacity-40"
      />
      <div className="mx-auto max-w-4xl px-6 py-32 text-center sm:py-48">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{title}</h1>
        {description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-gray-300">{description}</p>
        )}
        <CtaGroup ctas={ctas} className="mt-10 justify-center" />
      </div>
    </section>
  )
}
