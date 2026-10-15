import { ChartUpwardIcon } from '@sanity/icons/ChartUpward'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { MAX_STAT_DECIMALS, formatStat } from '@/lib/stats/format-stat'

import { lengthWarning } from './length-guidance'

/** Longest text the design handles. Longer text still publishes, with a warning. */
export const STAT_LIMITS = {
  // A number this wide is a long way past a headline figure at the stat's text size.
  prefix: 3,
  suffix: 4,
  // text-small beneath the figure, two lines in a narrow column.
  label: 40,
  // text-small under a statistics bar: one line on a phone.
  caption: 90,
} as const

/** How many figures a statistics bar holds: fewer looks lonely, more won't fit in a row. */
export const STATS_BAR_ITEMS = { min: 2, max: 4 } as const

/** How many figures the Stats section holds. */
export const STATS_SECTION_ITEMS = { min: 1, max: 6 } as const

interface StatPreview {
  value?: number
  decimals?: number
  prefix?: string
  suffix?: string
  label?: string
}

/**
 * One figure: "12,500+ happy customers". Shared by the Stats section and the statistics bar a hero
 * can carry. The figure is typed as a number and formatted by the site (`en-AU`), so editors never
 * type commas and the count-up has a number to count to.
 */
export const statItem = defineType({
  name: 'statItem',
  title: 'Statistic',
  type: 'object',
  icon: ChartUpwardIcon,
  // Prefix, suffix and decimals suit most figures at their defaults, so they stay out of the way.
  fieldsets: [
    { name: 'format', title: 'Number format', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: 'value',
      type: 'number',
      description: 'The figure, without commas or symbols: 12500, not 12,500.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      type: 'string',
      description: 'What the figure counts, e.g. "Projects delivered".',
      validation: (rule) => [rule.required(), lengthWarning(rule, STAT_LIMITS.label, 'Labels')],
    }),
    defineField({
      name: 'prefix',
      type: 'string',
      fieldset: 'format',
      description: 'Shown before the figure, e.g. $',
      validation: (rule) => lengthWarning(rule, STAT_LIMITS.prefix, 'Prefixes'),
    }),
    defineField({
      name: 'suffix',
      type: 'string',
      fieldset: 'format',
      description: 'Shown after the figure, e.g. +, % or m',
      validation: (rule) => lengthWarning(rule, STAT_LIMITS.suffix, 'Suffixes'),
    }),
    defineField({
      name: 'decimals',
      type: 'number',
      fieldset: 'format',
      initialValue: 0,
      description: 'Decimal places to show: 0 for 4, 1 for 4.9.',
      validation: (rule) => rule.integer().min(0).max(MAX_STAT_DECIMALS),
    }),
  ],
  preview: {
    select: {
      value: 'value',
      decimals: 'decimals',
      prefix: 'prefix',
      suffix: 'suffix',
      label: 'label',
    },
    prepare: ({ value, decimals, prefix, suffix, label }: StatPreview) => ({
      title:
        typeof value === 'number'
          ? formatStat({ value, decimals, prefix, suffix })
          : 'No figure yet',
      subtitle: label,
    }),
  },
})

/**
 * A compact row of two to four figures with no section around it, made for the hero's statistics
 * slot. It takes the tone of whatever it sits in.
 */
export const statsBar = defineType({
  name: 'statsBar',
  title: 'Statistics bar',
  type: 'object',
  icon: ChartUpwardIcon,
  fields: [
    defineField({
      name: 'items',
      type: 'array',
      of: [defineArrayMember({ type: 'statItem' })],
      validation: (rule) => rule.required().min(STATS_BAR_ITEMS.min).max(STATS_BAR_ITEMS.max),
    }),
    defineField({
      name: 'caption',
      type: 'string',
      description: 'Optional line beneath the figures, e.g. "As of June 2026".',
      validation: (rule) => lengthWarning(rule, STAT_LIMITS.caption, 'Captions'),
    }),
  ],
  preview: {
    select: { items: 'items', caption: 'caption' },
    prepare: ({ items, caption }: { items?: unknown[]; caption?: string }) => ({
      title: 'Statistics bar',
      subtitle: caption ?? `${items?.length ?? 0} figures`,
    }),
  },
})
