import { useId } from 'react'

import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

const DEFAULTS: SectionDefaults = { container: 'max-w-measure-narrow', align: 'start' }

/** A heading and intro around a form. The form itself comes from the route (`renderForm`). */
export function FormSection({ data, isFirst, renderForm }: SectionProps<'formSection'>) {
  const { heading, text, form } = data
  const title = sectionTitle(data)
  const headingId = useId()
  const { text: textAlign } = sectionTraits(data.style, DEFAULTS)

  // The reference points at a deleted form: skip the gap rather than show a broken one. (Typegen
  // can't know a reference dangles, so it types `form` as always present.)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!form) return null

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
      {renderForm?.(form, title ? headingId : undefined)}
    </SectionFrame>
  )
}
