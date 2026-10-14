import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
} as const

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  groups: sectionGroups,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Section title',
        type: 'string',
        validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
      }),
      defineField({
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
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
    { align: 'center' },
  ),
  preview: {
    select: { title: 'title', items: 'items' },
    prepare: ({ title, items }: { title?: string; items?: unknown[] }) => ({
      title: title || 'FAQ',
      subtitle: `FAQ · ${items?.length ?? 0} questions`,
    }),
  },
})
