import { useId } from 'react'

import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../types'

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
      {(title || text) && (
        <header className={`mb-10 ${textAlign}`}>
          {title && (
            <RichHeading
              as="h2"
              id={headingId}
              blocks={heading}
              fallback={title}
              className="text-h2 font-semibold text-balance"
            />
          )}
          <PlainText text={text} className="mt-4 text-lead text-pretty text-ink-muted" />
        </header>
      )}
      {renderForm?.(form, title ? headingId : undefined)}
    </SectionFrame>
  )
}
