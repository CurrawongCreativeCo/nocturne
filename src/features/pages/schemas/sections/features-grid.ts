import { ThLargeIcon } from '@sanity/icons/ThLarge'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageField } from '@/lib/sanity/schema/image-field'
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

export const featuresGrid = defineType({
  name: 'featuresGrid',
  title: 'Features grid',
  type: 'object',
  icon: ThLargeIcon,
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
              imageField({
                name: 'icon',
                title: 'Icon / image',
                // Decorative: the feature title next to it says what it means.
                requireAlt: false,
                description: 'SVG or square image. Decorative, so screen readers skip it.',
              }),
              defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
              defineField({ name: 'text', type: 'text', rows: 3 }),
            ],
            preview: { select: { title: 'title', subtitle: 'text', media: 'icon' } },
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
      title: headingPlainText(heading) || title || 'Features grid',
      subtitle: joinSubtitle('Features grid', `${items?.length ?? 0} items`, toneTitle(tone)),
    }),
  },
})
