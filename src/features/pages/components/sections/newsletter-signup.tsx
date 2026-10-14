import { useId } from 'react'

import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = { container: 'max-w-measure-narrow', align: 'start' }

/** A heading and intro around a signup form. The form itself comes from the route (`renderNewsletter`). */
export function NewsletterSignup({
  data,
  isFirst,
  renderNewsletter,
}: SectionProps<'newsletterSignup'>) {
  const { title, text, submitLabel, successMessage } = data
  const headingId = useId()
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame style={data.style} defaults={DEFAULTS} isFirst={isFirst}>
      <header className={`mb-10 ${textAlign}`}>
        <h2 id={headingId} className="text-h2 font-semibold text-balance">
          {title}
        </h2>
        {text && <p className="mt-4 text-lead text-pretty text-ink-muted">{text}</p>}
      </header>
      {renderNewsletter?.({ submitLabel, successMessage, headingId })}
    </SectionFrame>
  )
}
