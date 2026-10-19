import { useId } from 'react'

import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { container: 'max-w-measure-narrow', align: 'start' }

/** A heading and intro around a signup form. The form itself comes from the route (`renderNewsletter`). */
export function NewsletterSignup({
  data,
  isFirst,
  renderNewsletter,
}: SectionProps<'newsletterSignup'>) {
  const { heading, text, submitLabel, successMessage } = data
  const title = sectionTitle(data)
  const headingId = useId()
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <header className={`mb-10 ${textAlign}`}>
        <RichHeading
          as="h2"
          id={headingId}
          blocks={heading}
          fallback={title}
          className="text-h2 font-semibold text-balance"
        />
        <PlainText text={text} className="mt-4 text-lead text-pretty text-ink-muted" />
      </header>
      {renderNewsletter?.({ submitLabel, successMessage, headingId })}
    </SectionFrame>
  )
}
