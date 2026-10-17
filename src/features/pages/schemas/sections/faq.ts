import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

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
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
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
    select: { heading: 'heading', title: 'title', items: 'items', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      items,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      items?: unknown[]
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'FAQ',
      subtitle: joinSubtitle('FAQ', `${items?.length ?? 0} questions`, toneTitle(tone)),
    }),
  },
})
