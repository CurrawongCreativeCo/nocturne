import { RichText as RichTextBody } from '@/components/ui/rich-text'
import { SectionFrame } from '@/components/ui/section-frame'
import { sectionTraits, type SectionDefaults } from '@/components/ui/section-style'

import type { SectionProps } from '../../types'

const DEFAULTS: SectionDefaults = {
  spacing: 'compact',
  container: 'max-w-measure',
  align: 'start',
}

export function RichText({ data, isFirst }: SectionProps<'richText'>) {
  const { text } = sectionTraits(data.style, DEFAULTS)

  return (
    <SectionFrame
      style={data.style}
      defaults={DEFAULTS}
      isFirst={isFirst}
      containerClassName={`text-lead text-ink ${text}`}
    >
      <RichTextBody value={data.body} />
    </SectionFrame>
  )
}
