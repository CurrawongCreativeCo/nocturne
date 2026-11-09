import { stegaClean, toPlainText } from 'next-sanity'

import { CardSurface } from '@/components/ui/card-surface'
import { JsonLd } from '@/components/ui/json-ld'
import { RichText } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { resolveCardDesign, type CardDesign } from '@/lib/sanity/card-design'
import { CARD_SHADOW_CLASS, OWN_SHADOW, resolveCardDepth } from '@/lib/sanity/depth-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'
import { graph } from '@/lib/structured-data/graph'
import { buildFaqPage } from '@/lib/structured-data/nodes/faq-page'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { container: 'max-w-measure', align: 'center' }

/** The text roles both item styles draw (faq-capabilities.ts), and what each draws with nothing chosen. */
const ROLES = ['title', 'body'] as const
const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const
const OWN_TITLE = { size: 'text-lead', weight: 'medium' } as const
const SUMMARY =
  'flex list-none items-center justify-between gap-4 text-lead font-medium [&::-webkit-details-marker]:hidden'
const OWN_BODY = { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' } as const

/** The Cards item style's surface. The question opens in place, so a chosen fill has no hover shade. */
const CARD = `relative rounded-card bg-surface ${CARD_SHADOW_CLASS.shadowed} ring-1 ring-line`
const OWN_SURFACE = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }

type Item = SectionProps<'faq'>['data']['items'][number]

/** One question: a native <details>, so it works without JavaScript. */
function Question({
  item,
  className,
  look,
}: {
  item: Item
  className: string
  look: CardDesign<(typeof ROLES)[number]>
}) {
  const body = textRoleProps('body', 'mt-2 text-ink-muted', OWN_BODY, look.text.body)
  return (
    <details className={className}>
      <summary {...textRoleProps('title', SUMMARY, OWN_TITLE, look.text.title)}>
        {item.question}
        <span
          aria-hidden
          className="text-2xl leading-none text-ink-muted transition group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <RichText value={item.answer} className={body.className} style={body.style} textRole="body" />
    </details>
  )
}

/** Native <details> accordion: accessible and works without JavaScript. */
export function Faq({ data, isFirst, page }: SectionProps<'faq'>) {
  const { heading, intro, items } = data
  const title = sectionTitle(data)
  const { text, tone } = sectionTraits(data.style, DEFAULTS)
  // Empty is the Divided list. A card's mark sits outside the <details>, which hides what it holds while closed.
  const cards = stegaClean(data.cardDesign?.itemStyle) === 'cards'
  const look = resolveCardDesign(data.cardDesign, ROLES)

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
      <SectionHeader
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={intro}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        className={`mb-12 ${text}`}
      />
      {cards ? (
        <div className="grid gap-4">
          {items.map((item) => (
            <CardSurface
              key={item._key}
              as="div"
              className={CARD}
              own={OWN_SURFACE}
              shadow={CARD_SHADOW_CLASS.shadowed}
              depth={resolveCardDepth([data.cardDesign], OWN_SHADOW.siteCard)}
              design={look.surface}
              mark={{
                input: data.cardDesign?.mark,
                scope: 'card',
                tone,
                levels: [data.cardDesign],
              }}
            >
              <Question item={item} className="group p-6" look={look} />
            </CardSurface>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <Question key={item._key} item={item} className="group py-5" look={look} />
          ))}
        </div>
      )}
    </SectionFrame>
  )
}
