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
      // With no title above it, the intro needs no margin.
      introClass={title ? undefined : 'text-lead text-pretty text-ink-muted'}
      design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      block={block}
      text={text}
    />
  )
}

/** Names are headings: one level under the section's title, or the section's own level without one. */
export const headingLevelFor = (data: SectionProps<'team'>['data']) =>
  sectionTitle(data) ? 'h3' : 'h2'
