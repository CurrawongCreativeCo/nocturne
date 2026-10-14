import { BulbOutlineIcon } from '@sanity/icons/BulbOutline'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

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
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
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
  ),
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({
      title: title || 'Untitled',
      subtitle: 'Call to action banner',
    }),
  },
})
