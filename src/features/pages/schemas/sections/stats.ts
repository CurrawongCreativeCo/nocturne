import { ChartUpwardIcon } from '@sanity/icons/ChartUpward'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import { STATS_SECTION_ITEMS } from '@/lib/sanity/schema/stats'
import {
  StatsCardsThumbnail,
  StatsInlineThumbnail,
} from '@/lib/sanity/schema/thumbnails/stats-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
} as const

/**
 * One component per variant in components/sections/stats/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const STATS_VARIANTS = [
  {
    value: 'inline',
    title: 'Inline',
    description: 'Big figures side by side on the page.',
    thumbnail: StatsInlineThumbnail,
  },
  {
    value: 'cards',
    title: 'Cards',
    description: 'Each figure in its own card.',
    thumbnail: StatsCardsThumbnail,
  },
] as const

/**
 * What a new Stats section starts with, so it looks finished before anyone edits it. They are
 * examples: the field's description says to replace them.
 */
const EXAMPLE_ITEMS = [
  { _type: 'statItem', value: 250, decimals: 0, suffix: '+', label: 'Projects delivered' },
  { _type: 'statItem', value: 98, decimals: 0, suffix: '%', label: 'Client satisfaction' },
  { _type: 'statItem', value: 12, decimals: 0, label: 'Years in business' },
]

export const stats = defineType({
  name: 'stats',
  title: 'Stats',
  type: 'object',
  icon: ChartUpwardIcon,
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
        name: 'items',
        type: 'array',
        description: 'Three figures look best. These are examples: replace them with your own.',
        of: [defineArrayMember({ type: 'statItem' })],
        initialValue: EXAMPLE_ITEMS,
        validation: (rule) =>
          rule.required().min(STATS_SECTION_ITEMS.min).max(STATS_SECTION_ITEMS.max),
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(STATS_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components. The figures
    // count up when the section scrolls into view; Animation "None" turns that off.
    { align: 'center', motion: 'reveal' },
  ),
  preview: {
    select: { title: 'title', variant: 'variant', tone: 'style.tone' },
    prepare: ({ title, variant, tone }: { title?: string; variant?: string; tone?: string }) => ({
      title: title || 'Stats',
      subtitle: variantSubtitle('Stats', STATS_VARIANTS, variant, tone),
    }),
  },
})
