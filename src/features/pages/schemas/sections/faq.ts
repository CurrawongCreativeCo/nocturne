import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: 'title', title: 'Section title', type: 'string' }),
    defineField({ name: 'intro', type: 'text', rows: 2 }),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'faqItem',
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              type: 'blockContent',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: 'question' } },
        }),
      ],
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title', items: 'items' },
    prepare: ({ title, items }: { title?: string; items?: unknown[] }) => ({
      title: title || 'FAQ',
      subtitle: `FAQ · ${items?.length ?? 0} questions`,
    }),
  },
})
