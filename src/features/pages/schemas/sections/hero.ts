import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-display, balanced over max-w-4xl: about three lines on a phone.
  title: 80,
  // text-lead in max-w-measure-narrow: about four lines.
  description: 200,
} as const

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: BlockContentIcon,
  groups: sectionGroups,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'description',
        type: 'text',
        rows: 3,
        validation: (rule) => lengthWarning(rule, LIMITS.description, 'Intro text'),
      }),
      defineField({
        name: 'ctas',
        title: 'Calls to action',
        type: 'array',
        of: [defineArrayMember({ type: 'cta' })],
        validation: (rule) => rule.max(2),
      }),
      // Full-bleed and cropped to fit, so any landscape picture works; width is what keeps it sharp.
      imageField({
        name: 'backgroundImage',
        requireAlt: false,
        minWidth: 2400,
        orientation: 'landscape',
      }),
      defineField({
        name: 'showGreeting',
        title: 'Greet returning visitors',
        description: 'Shows a short "Welcome back" to people who have visited before.',
        type: 'boolean',
        initialValue: false,
      }),
      accessField,
    ],
    { tone: 'inverse', spacing: 'spacious', align: 'center', motion: 'none' },
  ),
  preview: {
    select: { title: 'title', media: 'backgroundImage' },
    prepare: ({ title, media }: { title?: string; media?: PreviewValue['media'] }) => ({
      title: title || 'Untitled',
      subtitle: 'Hero',
      media,
    }),
  },
})
