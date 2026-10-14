import { RichText as RichTextBody } from '@/components/ui/rich-text'

import type { SectionProps } from '../../types'

export function RichText({ data }: SectionProps<'richText'>) {
  return (
    <section className="mx-auto max-w-measure px-gutter py-section-compact text-lead text-ink">
      <RichTextBody value={data.body} />
    </section>
  )
}
