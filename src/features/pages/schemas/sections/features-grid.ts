import { ThLargeIcon } from '@sanity/icons/ThLarge'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

export const featuresGrid = defineType({
  name: 'featuresGrid',
  title: 'Features grid',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'title', title: 'Section title', type: 'string' }),
    defineField({ name: 'intro', type: 'text', rows: 2 }),
    defineField({
      name: 'columns',
      type: 'number',
      initialValue: 3,
      options: { list: [2, 3, 4], layout: 'radio', direction: 'horizontal' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'items',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'featureItem',
          type: 'object',
          fields: [
            imageField({ name: 'icon', title: 'Icon / image', description: 'SVG or square image' }),
            defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'text', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'title', subtitle: 'text', media: 'icon' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', items: 'items' },
    prepare: ({ title, items }: { title?: string; items?: unknown[] }) => ({
      title: title || 'Features grid',
      subtitle: `Features grid · ${items?.length ?? 0} items`,
    }),
  },
})
