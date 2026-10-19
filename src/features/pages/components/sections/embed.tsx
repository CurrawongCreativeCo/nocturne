import { stegaClean } from 'next-sanity'

import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { embedHeight, embedNotes, resolveEmbed } from '@/config/embed-providers'
import { sectionTitle } from '@/lib/sanity/section-title'

import { LazyFacade } from './lazy-facade'
import type { SectionProps } from '../../types'

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

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={textAlign}
    >
      <RichHeading
        as="h2"
        blocks={heading}
        fallback={title}
        className="text-h2 font-semibold text-balance"
      />
      {text && (
        <PlainText
          text={text}
          className="mt-4 max-w-measure-narrow text-lead text-pretty text-ink-muted"
        />
      )}
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
          }}
        />
      </div>
    </SectionFrame>
  )
}
