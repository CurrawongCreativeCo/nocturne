import { TextIcon } from '@sanity/icons/Text'
import { defineField, defineType } from 'sanity'

export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({ name: 'body', type: 'blockContent', validation: (rule) => rule.required() }),
  ],
  preview: {
    select: { body: 'body' },
    prepare: ({ body }: { body?: unknown }) => ({
      title: blockPreview(body) || 'Empty text',
      subtitle: 'Rich text',
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
