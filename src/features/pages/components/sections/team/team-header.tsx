import { RichHeading } from '@/components/ui/rich-heading'
import { sectionTitle } from '@/lib/sanity/section-title'

import type { SectionProps } from '../../../types'

/** The section's title and intro. Without a title the intro stands alone; without either, nothing. */
export function TeamHeader({
  data,
  classes,
}: {
  data: SectionProps<'team'>['data']
  /** Block and text alignment classes from `sectionTraits`. */
  classes: string
}) {
  const { heading, text } = data
  const title = sectionTitle(data)
  if (!title && !text) return null

  return (
    <div className={`mb-12 max-w-measure-narrow ${classes}`}>
      {title && (
        <RichHeading
          as="h2"
          blocks={heading}
          fallback={title}
          className="text-h2 font-semibold text-balance"
        />
      )}
      {text && (
        <p className={`${title ? 'mt-4' : ''}text-lead text-pretty text-ink-muted`}>{text}</p>
      )}
    </div>
  )
}

/** Names are headings: one level under the section's title, or the section's own level without one. */
export const headingLevelFor = (data: SectionProps<'team'>['data']) =>
  sectionTitle(data) ? 'h3' : 'h2'
