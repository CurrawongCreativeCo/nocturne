import { TagIcon } from '@sanity/icons/Tag'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BADGE_ICONS } from '../badge-icons'
import { lengthWarning } from './length-guidance'

/** Longest text the design handles. Longer text still publishes, with a warning. */
export const BADGE_LIMITS = {
  // A pill of text-small: three of them share a line on a tablet.
  label: 28,
} as const

/** How many badges a row holds: one is a lone pill, more than three stops being a glance. */
export const BADGE_ROW_ITEMS = { min: 1, max: 3 } as const

/**
 * One to three short labels with an optional icon ("Free shipping", "Locally owned"), for the hero's
 * supporting slot. It takes the tone of whatever it sits in.
 */
export const badgeRow = defineType({
  name: 'badgeRow',
  title: 'Badges',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'badges',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'badge',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              description: 'A few words, e.g. "Locally owned".',
              validation: (rule) => [
                rule.required(),
                lengthWarning(rule, BADGE_LIMITS.label, 'Labels'),
              ],
            }),
            defineField({
              name: 'icon',
              type: 'string',
              description: 'Optional. A small picture before the label.',
              options: {
                list: BADGE_ICONS.map(({ value, title }) => ({ value, title })),
              },
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'icon' } },
        }),
      ],
      validation: (rule) => rule.required().min(BADGE_ROW_ITEMS.min).max(BADGE_ROW_ITEMS.max),
    }),
  ],
  preview: {
    select: { badges: 'badges' },
    prepare: ({ badges }: { badges?: { label?: string }[] }) => ({
      title: 'Badges',
      subtitle:
        badges
          ?.map(({ label }) => label)
          .filter(Boolean)
          .join(' · ') || 'No badges yet',
    }),
  },
})
