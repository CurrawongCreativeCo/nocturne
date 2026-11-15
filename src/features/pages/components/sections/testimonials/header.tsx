import { SectionHeader } from '@/components/ui/section-header'
import { sectionTraits } from '@/components/ui/section-style'
import { resolveDivider } from '@/lib/sanity/divider-options'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles } from '@/lib/sanity/text-role'

import { DEFAULTS } from './defaults'
import type { SectionProps } from '../../../types'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** The header every layout draws above its quotes. A title alone stays the bare heading it always was. */
export function TestimonialsHeader({ data }: { data: SectionProps<'testimonials'>['data'] }) {
  const { block, text } = sectionTraits(data.style, DEFAULTS)
  return (
    <SectionHeader
      eyebrow={data.eyebrow}
      title={sectionTitle(data)}
      heading={data.heading}
      intro={data.intro}
      design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      divider={resolveDivider(data.headerDesign?.divider)}
      block={block}
      text={text}
      bare
    />
  )
}
