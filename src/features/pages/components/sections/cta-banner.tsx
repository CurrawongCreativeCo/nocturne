import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { CARD_SHADOW_CLASS, OWN_SHADOW, resolveCardDepth } from '@/lib/sanity/depth-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

const DEFAULTS: SectionDefaults = {
  spacing: 'compact',
  container: 'max-w-5xl',
  align: 'center',
}

/**
 * The banner's own `tone` colours the card; the section around it is coloured by the shared style.
 * The card is a `data-tone` element of its own, so it recolours its text and buttons like a section.
 * (Brand text stays at full strength: 80% opacity measured 3.84:1 on the brand colour, below AA.)
 */
const cards = {
  brand: { tone: 'accent', surface: 'dark' },
  dark: { tone: 'inverse', surface: 'dark' },
  light: { tone: 'alt', surface: 'light' },
} as const

export function CtaBanner({ data, isFirst }: SectionProps<'ctaBanner'>) {
  const { heading, text, ctas } = data
  const title = sectionTitle(data)
  const card = cards[stegaClean(data.tone)]
  const { block, text: textAlign, justify } = sectionTraits(data.style, DEFAULTS)
  // The card draws no shadow of its own: a site-wide Card depth, or a depth chosen here, gives it one.
  const depth = resolveCardDepth([data.cardDesign], OWN_SHADOW.siteCardFree)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <div
        data-tone={card.tone}
        className={`rounded-panel px-8 py-section-compact ${depth?.className ?? CARD_SHADOW_CLASS.free} text-ink sm:px-16 ${textAlign}`}
        style={depth?.style}
      >
        <SectionHeader
          as={null}
          eyebrow={data.eyebrow}
          title={title}
          heading={heading}
          intro={text}
          design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
          introClass={`mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted ${block}`}
        />
        <CtaGroup ctas={ctas} surface={card.surface} className={`mt-8 ${justify}`} />
      </div>
    </SectionFrame>
  )
}
