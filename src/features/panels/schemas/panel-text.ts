import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineField, defineType } from 'sanity'

import { altField, imageOptions } from '@/lib/sanity/schema/image-field'

/** Panel content: text with an optional picture above it. */
export const panelText = defineType({
  name: 'panelText',
  title: 'Text',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Picture (optional)',
      type: 'image',
      options: imageOptions,
      fields: [altField({ required: true })],
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { body: 'body', media: 'image' },
    prepare: ({
      body,
      media,
    }: {
      body?: { children?: { text?: string }[] }[]
      media?: unknown
    }) => ({
      title:
        body
          ?.find((block) => block.children)
          ?.children?.map((span) => span.text)
          .join('') || 'Text',
      subtitle: media ? 'Text with a picture' : 'Text',
      media: media as never,
    }),
  },
})
