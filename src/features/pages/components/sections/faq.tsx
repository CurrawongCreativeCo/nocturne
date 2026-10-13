import { stegaClean, toPlainText } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { RichText } from '@/components/ui/rich-text'

import type { SectionProps } from '../../types'

/** Native <details> accordion: accessible and works without JavaScript. */
export function Faq({ data }: SectionProps<'faq'>) {
  const { title, intro, items } = data

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: stegaClean(item.question),
            acceptedAnswer: {
              '@type': 'Answer',
              text: stegaClean(toPlainText(item.answer)),
            },
          })),
        }}
      />
      {(title || intro) && (
        <header className="mb-12 text-center">
          {title && (
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h2>
          )}
          {intro && <p className="mt-4 text-lg text-pretty text-gray-600">{intro}</p>}
        </header>
      )}
      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {items.map((item) => (
          <details key={item._key} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="text-2xl leading-none text-gray-400 transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <RichText value={item.answer} className="mt-2 text-gray-600" />
          </details>
        ))}
      </div>
    </section>
  )
}
