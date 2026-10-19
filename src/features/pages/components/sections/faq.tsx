import { stegaClean, toPlainText } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { RichText } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { container: 'max-w-measure', align: 'center' }

/** Native <details> accordion: accessible and works without JavaScript. */
export function Faq({ data, isFirst }: SectionProps<'faq'>) {
  const { heading, intro, items } = data
  const title = sectionTitle(data)
  const { text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
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
        <header className={`mb-12 ${text}`}>
          {title && (
            <RichHeading
              as="h2"
              blocks={heading}
              fallback={title}
              className="text-h2 font-semibold text-balance"
            />
          )}
          <PlainText text={intro} className="mt-4 text-lead text-pretty text-ink-muted" />
        </header>
      )}
      <div className="divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item._key} className="group py-5">
            <summary className="flex list-none items-center justify-between gap-4 text-lead font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="text-2xl leading-none text-ink-muted transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <RichText value={item.answer} className="mt-2 text-ink-muted" />
          </details>
        ))}
      </div>
    </SectionFrame>
  )
}
