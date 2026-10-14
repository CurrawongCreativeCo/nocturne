import { Suspense } from 'react'

import { CtaGroup } from '@/components/ui/cta-link'
import { SanityImage } from '@/components/ui/sanity-image'

import type { SectionProps } from '../../types'

/**
 * `data` is SectionOf<'hero'>: the exact projection of `heroFragment`, generated
 * by TypeGen. Nullable fields are typed nullable — the compiler enforces fallbacks.
 */
export function Hero({ data, isFirst = false, greeting }: SectionProps<'hero'>) {
  const { title, description, ctas, backgroundImage, showGreeting } = data
  // One <h1> per page: a hero further down the page is a section heading.
  const Heading = isFirst ? 'h1' : 'h2'

  return (
    <section className="relative isolate overflow-hidden bg-surface-inverse text-ink-inverse">
      <SanityImage
        image={backgroundImage}
        fill
        preload={isFirst}
        sizes="100vw"
        className="-z-10 object-cover opacity-40"
      />
      <div className="mx-auto max-w-4xl px-gutter py-section-spacious text-center">
        <Heading className="text-display font-semibold text-balance">{title}</Heading>
        {/* Request-time (cookie) content: the page stays prerendered around this boundary. */}
        {showGreeting && <Suspense fallback={null}>{greeting}</Suspense>}
        {description && (
          <p className="mx-auto mt-6 max-w-measure-narrow text-lead text-pretty text-ink-inverse-muted">
            {description}
          </p>
        )}
        <CtaGroup ctas={ctas} className="mt-10 justify-center" />
      </div>
    </section>
  )
}
