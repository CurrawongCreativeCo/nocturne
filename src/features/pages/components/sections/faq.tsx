import { stegaClean, toPlainText } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { RichText } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'
import { graph } from '@/lib/structured-data/graph'
import { buildFaqPage } from '@/lib/structured-data/nodes/faq-page'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { container: 'max-w-measure', align: 'center' }

/** Native <details> accordion: accessible and works without JavaScript. */
export function Faq({ data, isFirst, page }: SectionProps<'faq'>) {
  const { heading, intro, items } = data
  const title = sectionTitle(data)
  const { text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      {/* One FAQPage per page, keyed by its URL: the first FAQ section carries every visible question, after any the page shows above its sections. */}
      {page && page.faqSections[0]?._key === data._key && (
        <JsonLd
          data={graph(
            buildFaqPage({
              url: page.url,
              doc: page.documentId,
              questions: [
                ...(page.leadingQuestions ?? []),
                ...page.faqSections.flatMap((section) =>
                  section.items.map((item) => ({
                    question: stegaClean(item.question),
                    answer: stegaClean(toPlainText(item.answer)),
                    field: `${page.path}[_key=="${section._key}"].items[_key=="${item._key}"]`,
                  })),
                ),
              ],
            }),
          )}
        />
      )}
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
