import { RichText as RichTextBody } from '@/components/ui/rich-text'

import type { SectionProps } from '../../types'

export function RichText({ data }: SectionProps<'richText'>) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-lg text-gray-800">
      <RichTextBody value={data.body} />
    </section>
  )
}
