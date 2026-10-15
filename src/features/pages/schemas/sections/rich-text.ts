import { TextIcon } from '@sanity/icons/Text'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'object',
  icon: TextIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({ name: 'body', type: 'blockContent', validation: (rule) => rule.required() }),
      accessField,
    ],
    { spacing: 'compact', align: 'start' },
  ),
  preview: {
    select: { body: 'body', tone: 'style.tone' },
    prepare: ({ body, tone }: { body?: unknown; tone?: string }) => ({
      title: blockPreview(body) || 'Empty text',
      subtitle: joinSubtitle('Rich text', toneTitle(tone)),
    }),
  },
})

/** First line of plain text in a Portable Text array, for previews. */
function blockPreview(blocks: unknown): string {
  const block = (blocks as { _type: string; children?: { text?: string }[] }[] | undefined)?.find(
    (b) => b._type === 'block',
  )
  return block?.children?.map((c) => c.text ?? '').join('') ?? ''
}
