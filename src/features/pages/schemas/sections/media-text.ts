import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

export const mediaText = defineType({
  name: 'mediaText',
  title: 'Image + text',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({ name: 'eyebrow', type: 'string', description: 'Small label above the title.' }),
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'body', type: 'blockContent' }),
    defineField({
      name: 'ctas',
      title: 'Calls to action',
      type: 'array',
      of: [defineArrayMember({ type: 'cta' })],
      validation: (rule) => rule.max(2),
    }),
    imageField({ name: 'image' }),
    defineField({
      name: 'imagePosition',
      type: 'string',
      initialValue: 'right',
      options: { list: ['left', 'right'], layout: 'radio', direction: 'horizontal' },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', media: 'image' },
    prepare: ({ title, media }) => ({ title: title || 'Untitled', subtitle: 'Image + text', media }),
  },
})
