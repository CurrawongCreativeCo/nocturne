import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  ProcessAlternatingThumbnail,
  ProcessVerticalThumbnail,
} from '@/lib/sanity/schema/thumbnails/process-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
  // A small line above the step title ("Week 1").
  label: 24,
  stepTitle: 60,
  // Three or four lines beside the line.
  stepText: 240,
} as const

/**
 * One component per variant in components/sections/process/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const PROCESS_VARIANTS = [
  {
    value: 'vertical',
    title: 'Vertical',
    description: 'One line down the left, every step beside it. Also what phones see.',
    thumbnail: ProcessVerticalThumbnail,
  },
  {
    value: 'alternating',
    title: 'Alternating',
    description: 'Steps fall left and right of a centre line on large screens.',
    thumbnail: ProcessAlternatingThumbnail,
  },
] as const

/** What a new Process section starts with, so it looks finished before anyone edits it. Examples to replace. */
const EXAMPLE_STEPS = [
  {
    _type: 'processStep',
    label: 'Week 1',
    title: 'Discover',
    text: 'We learn about your business, your customers and what success looks like.',
  },
  {
    _type: 'processStep',
    label: 'Weeks 2–3',
    title: 'Design',
    text: 'We shape the look and feel, and share it with you for feedback.',
  },
  {
    _type: 'processStep',
    label: 'Weeks 4–6',
    title: 'Build',
    text: 'We bring the design to life and fill it with your content.',
  },
  {
    _type: 'processStep',
    label: 'Week 7',
    title: 'Launch',
    text: 'We test everything, go live and stay close while you settle in.',
  },
]

export const process = defineType({
  name: 'process',
  title: 'Process',
  type: 'object',
  icon: ArrowRightIcon,
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
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
      defineField({
        name: 'steps',
        type: 'array',
        description:
          'In order, top to bottom. Three to six steps work best. These are examples: replace them with your own.',
        initialValue: EXAMPLE_STEPS,
        validation: (rule) => rule.required().min(2).max(10),
        of: [
          defineArrayMember({
            name: 'processStep',
            type: 'object',
            fields: [
              defineField({
                name: 'label',
                type: 'string',
                description: 'A short line above the title, such as "Week 1" or "Step one".',
                validation: (rule) => lengthWarning(rule, LIMITS.label, 'Step labels'),
              }),
              defineField({
                name: 'title',
                type: 'string',
                validation: (rule) => [
                  rule.required(),
                  lengthWarning(rule, LIMITS.stepTitle, 'Step titles'),
                ],
              }),
              defineField({
                name: 'text',
                type: 'text',
                rows: 3,
                validation: (rule) => lengthWarning(rule, LIMITS.stepText, 'Step text'),
              }),
              imageField({
                name: 'icon',
                title: 'Icon / image',
                // Decorative: the step title next to it says what it means.
                requireAlt: false,
                description:
                  'Optional. SVG or square image. Decorative, so screen readers skip it.',
              }),
            ],
            preview: { select: { title: 'title', subtitle: 'label', media: 'icon' } },
          }),
        ],
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(PROCESS_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components. The steps
    // reveal one after another (the Stagger preset) as they scroll into view; Animation "None"
    // turns that off. The line fills as the page scrolls either way.
    { align: 'start', motion: 'stagger' },
  ),
  preview: {
    select: { title: 'title', variant: 'variant', tone: 'style.tone' },
    prepare: ({ title, variant, tone }: { title?: string; variant?: string; tone?: string }) => ({
      title: title || 'Process',
      subtitle: variantSubtitle('Process', PROCESS_VARIANTS, variant, tone),
    }),
  },
})
