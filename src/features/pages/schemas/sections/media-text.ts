import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in half the content width.
  title: 60,
  // Small label above the title.
  eyebrow: 30,
} as const

export const mediaText = defineType({
  name: 'mediaText',
  title: 'Image + text',
  type: 'object',
  icon: SplitHorizontalIcon,
  groups: sectionGroups,
  fields: sectionFields(
    [
      defineField({
        name: 'eyebrow',
        type: 'string',
        description: 'Small label above the title.',
        validation: (rule) => lengthWarning(rule, LIMITS.eyebrow, 'Labels'),
      }),
      defineField({
        name: 'title',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({ name: 'body', type: 'blockContent' }),
      defineField({
        name: 'ctas',
        title: 'Calls to action',
        type: 'array',
        of: [defineArrayMember({ type: 'cta' })],
        validation: (rule) => rule.max(2),
      }),
      imageField({ name: 'image', aspect: '4:3', minWidth: 1600 }),
      defineField({
        name: 'imagePosition',
        type: 'string',
        initialValue: 'right',
        options: { list: ['left', 'right'], layout: 'radio', direction: 'horizontal' },
        validation: (rule) => rule.required(),
      }),
      accessField,
    ],
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title', media: 'image' },
    prepare: ({ title, media }: { title?: string; media?: PreviewValue['media'] }) => ({
      title: title || 'Untitled',
      subtitle: 'Image + text',
      media,
    }),
  },
})
