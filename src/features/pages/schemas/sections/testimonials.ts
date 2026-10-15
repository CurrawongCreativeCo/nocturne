import { CommentIcon } from '@sanity/icons/Comment'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
} as const

export const testimonials = defineType({
  name: 'testimonials',
  title: 'Testimonials',
  type: 'object',
  icon: CommentIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Section title',
        type: 'string',
        validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
      }),
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
              imageField({ name: 'avatar', requireAlt: false, aspect: '1:1', minWidth: 800 }),
            ],
            preview: { select: { title: 'name', subtitle: 'quote', media: 'avatar' } },
          }),
        ],
      }),
      accessField,
    ],
    { tone: 'alt', align: 'center' },
  ),
  preview: {
    select: { title: 'title', items: 'items', tone: 'style.tone' },
    prepare: ({ title, items, tone }: { title?: string; items?: unknown[]; tone?: string }) => ({
      title: title || 'Testimonials',
      subtitle: joinSubtitle('Testimonials', items?.length ?? 0, toneTitle(tone)),
    }),
  },
})
