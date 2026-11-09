import { stegaClean } from 'next-sanity'

import { cardSurfaceProps } from '@/components/ui/card-surface'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { embedHeight, embedNotes, resolveEmbed } from '@/config/embed-providers'
import { CARD_SHADOW_CLASS, OWN_SHADOW, resolveCardDepth } from '@/lib/sanity/depth-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveSurface } from '@/lib/sanity/surface-options'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import { EMBED_CARD, EMBED_CARD_SURFACE } from './embed-facade-card'
import { LazyFacade } from './lazy-facade'
import type { SectionProps } from '../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { container: 'max-w-content', align: 'start' }

/**
 * A heading over an approved third-party embed (a form, a map, a player). The address is checked
 * against the provider's pattern and the iframe address rebuilt from it, so only the providers in
 * the registry (src/config/embed-providers.ts) can appear. The facade loads nothing until a click.
 * An address that doesn't resolve (the Studio blocks it, but stale content happens) renders nothing.
 */
export function Embed({ data, isFirst }: SectionProps<'embed'>) {
  const { heading, text } = data
  const title = sectionTitle(data)
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)
  const embed = resolveEmbed(stegaClean(data.provider), stegaClean(data.url))
  if (!embed) return null
  const { provider } = embed
  // The facade is a client component behind a lazy boundary, so the card's classes and style are worked out
  // here, on the server, and handed over as plain strings: with nothing chosen it is the card it always was
  // (plus the site's Card depth, once a site chooses one).
  const card = cardSurfaceProps({
    className: EMBED_CARD,
    own: EMBED_CARD_SURFACE,
    shadow: CARD_SHADOW_CLASS.free,
    depth: resolveCardDepth([data.cardDesign], OWN_SHADOW.siteCardFree),
    design: resolveSurface(data.cardDesign),
  })

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={textAlign}
    >
      <SectionHeader
        as={null}
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={text}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        introClass="mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted"
      />
      <div className="mt-8 text-center">
        <LazyFacade
          embed={{
            src: embed.src,
            openUrl: embed.openUrl,
            title: stegaClean(title) ?? 'Embedded content',
            provider: provider.label,
            sandbox: provider.sandbox.join(' '),
            allow: provider.allow,
            height: embedHeight(provider, stegaClean(data.height), data.customHeight),
            needsMarketing: provider.consent === 'marketing',
            notes: embedNotes(provider),
            cardClassName: card.className,
            cardStyle: card.style,
          }}
        />
      </div>
    </SectionFrame>
  )
}
