import { CommentIcon } from '@sanity/icons/Comment'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'

export const testimonials = defineType({
  name: 'testimonials',
  title: 'Testimonials',
  type: 'object',
  icon: CommentIcon,
  fields: [
    defineField({ name: 'title', title: 'Section title', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Testimonials',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'testimonial',
          type: 'object',
          fields: [
            defineField({
              name: 'quote',
              type: 'text',
              rows: 4,
              validation: (rule) => rule.required(),
            }),
            defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'role', type: 'string', description: 'e.g. "CEO, Acme"' }),
            imageField({ name: 'avatar', requireAlt: false }),
          ],
          preview: { select: { title: 'name', subtitle: 'quote', media: 'avatar' } },
        }),
      ],
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title', items: 'items' },
    prepare: ({ title, items }: { title?: string; items?: unknown[] }) => ({
      title: title || 'Testimonials',
      subtitle: `Testimonials · ${items?.length ?? 0}`,
    }),
  },
})
