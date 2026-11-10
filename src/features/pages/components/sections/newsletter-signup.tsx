import { useId } from 'react'

import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import { FormCard } from './form-card'
import type { SectionProps } from '../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

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
      <SectionHeader
        eyebrow={data.eyebrow}
        title={title}
        heading={heading}
        intro={text}
        design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
        className={`mb-10 ${textAlign}`}
        headingId={headingId}
      />
      <FormCard cardDesign={data.cardDesign}>
        {renderNewsletter?.({ submitLabel, successMessage, headingId })}
      </FormCard>
    </SectionFrame>
  )
}
