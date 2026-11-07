import { SectionHeader } from '@/components/ui/section-header'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import type { SectionProps } from '../../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** The section's title and intro. Without a title the intro stands alone; without either, nothing. */
export function TeamHeader({
  data,
  block,
  text,
}: {
  data: SectionProps<'team'>['data']
  /** Block and text alignment classes from `sectionTraits`. */
  block: string
  text: string
}) {
  const title = sectionTitle(data)
  return (
    <SectionHeader
      as="div"
      spacing="mb-12 max-w-measure-narrow"
      eyebrow={data.eyebrow}
      title={title}
      heading={data.heading}
      intro={data.text}
      // Kept exactly as it has always been drawn: with a title there is no space between "mt-4" and
      // "text-lead", so the intro under a title names neither. Fixing it is a visible change, for review.
      introClass={`${title ? 'mt-4' : ''}text-lead text-pretty text-ink-muted`}
      design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      block={block}
      text={text}
    />
  )
}

/** Names are headings: one level under the section's title, or the section's own level without one. */
export const headingLevelFor = (data: SectionProps<'team'>['data']) =>
  sectionTitle(data) ? 'h3' : 'h2'
