import { BulbOutlineIcon } from '@sanity/icons/BulbOutline'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-5xl.
  title: 70,
  // text-lead in max-w-measure-narrow: about three lines.
  text: 160,
} as const

export const ctaBanner = defineType({
  name: 'ctaBanner',
  title: 'Call to action banner',
  type: 'object',
  icon: BulbOutlineIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'text',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Intro text'),
      }),
      defineField({
        name: 'ctas',
        title: 'Calls to action',
        type: 'array',
        of: [defineArrayMember({ type: 'cta' })],
        validation: (rule) => rule.max(2),
      }),
      defineField({
        name: 'tone',
        type: 'string',
        initialValue: 'brand',
        options: {
          list: [
            { title: 'Brand', value: 'brand' },
            { title: 'Dark', value: 'dark' },
            { title: 'Light', value: 'light' },
          ],
          layout: 'radio',
          direction: 'horizontal',
        },
        validation: (rule) => rule.required(),
      }),
      accessField,
    ],
    { spacing: 'compact', align: 'center' },
    // The banner is its own coloured card, so the shared Panel isn't offered.
    { rules: { type: 'ctaBanner', ownsSurfaces: () => true } },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Untitled',
      subtitle: joinSubtitle('Call to action banner', toneTitle(tone)),
    }),
  },
})
