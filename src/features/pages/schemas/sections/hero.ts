import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-display, balanced over max-w-4xl: about three lines on a phone.
  title: 80,
  // text-lead in max-w-measure-narrow: about four lines.
  description: 200,
  // One line above the title.
  eyebrow: 40,
} as const

/**
 * One component per variant in components/sections/hero/. The first is the default: today's look,
 * and what content without a variant renders.
 */
export const HERO_VARIANTS = [
  { value: 'overlay', title: 'Overlay' },
  { value: 'split', title: 'Split' },
  { value: 'editorial', title: 'Editorial' },
  { value: 'full-bleed', title: 'Full bleed' },
] as const

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: BlockContentIcon,
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
      // Behind the text (Overlay, Full bleed) or beside it (Split). Cropped to fit, so any landscape
      // picture works; width is what keeps it sharp.
      imageField({
        name: 'backgroundImage',
        title: 'Image',
        description: 'Behind the text in Overlay and Full bleed, beside it in Split.',
        requireAlt: false,
        minWidth: 2400,
        orientation: 'landscape',
      }),
      defineField({
        name: 'imagePosition',
        title: 'Image side',
        description: 'Which side the picture sits on at desktop widths.',
        type: 'string',
        group: 'design',
        initialValue: 'right',
        options: { list: ['left', 'right'], layout: 'radio', direction: 'horizontal' },
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'split',
      }),
      // A small picture beside the oversized heading; the Editorial layout is the only one to use it.
      imageField({
        name: 'secondaryImage',
        title: 'Small picture',
        description: 'Shown beside the heading in Editorial. Optional.',
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'editorial',
        aspect: '1:1',
        minWidth: 800,
      }),
      defineField({
        name: 'showGreeting',
        title: 'Greet returning visitors',
        description: 'Shows a short "Welcome back" to people who have visited before.',
        type: 'boolean',
        initialValue: false,
      }),
      accessField,
      variantField(HERO_VARIANTS),
    ],
    // Alignment is left to the layout: Overlay centres, the others start.
    { tone: 'inverse', spacing: 'spacious', motion: 'none' },
  ),
  preview: {
    select: { title: 'title', media: 'backgroundImage', variant: 'variant' },
    prepare: ({
      title,
      media,
      variant,
    }: {
      title?: string
      media?: PreviewValue['media']
      variant?: string
    }) => ({
      title: title || 'Untitled',
      subtitle: variantSubtitle('Hero', HERO_VARIANTS, variant),
      media,
    }),
  },
})
