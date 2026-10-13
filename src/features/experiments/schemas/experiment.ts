import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { apiVersion } from '@/config/env'

import { CONTROL, VARIANT_ID_PATTERN } from '../utils/assign'

/**
 * One A/B test. Visitors are split between the page content as published ("control") and
 * one or more Sanity content variants. See README, "A/B tests".
 */
export const experiment = defineType({
  name: 'experiment',
  title: 'Experiment',
  type: 'document',
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      description: 'For your own reference and for analytics, e.g. "Home headline test".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'active',
      type: 'boolean',
      initialValue: false,
      description:
        'On: visitors are split between control and the variants below. Off: everyone sees the published content. Only one experiment can run at a time.',
      validation: (rule) =>
        rule.custom(async (value, context) => {
          if (!value) return true
          const id = context.document?._id.replace(/^drafts\./, '') ?? ''
          const others = await context
            .getClient({ apiVersion })
            .fetch<string[]>(
              '*[_type == "experiment" && active == true && !(_id in [$id, "drafts." + $id])].name',
              { id },
            )
          return others.length === 0
            ? true
            : `"${others[0] ?? 'Another experiment'}" is already running. Stop it first.`
        }),
    }),
    defineField({
      name: 'controlWeight',
      title: 'Control traffic',
      type: 'number',
      initialValue: 50,
      description:
        'Share of visitors who see the published content. Shares are relative: 50, 25 and 25 means half, a quarter and a quarter.',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'variants',
      type: 'array',
      description:
        'The content variants to test against control. Create each one first (see the README), then enter its ID here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'experimentVariant',
          fields: [
            defineField({
              name: 'variantId',
              title: 'Variant ID',
              type: 'string',
              description:
                'The ID of the content variant, e.g. "Ab12cd34". Letters, numbers, - and _.',
              validation: (rule) =>
                rule.required().custom((value) => {
                  if (!value) return true
                  if (value === CONTROL) return `"${CONTROL}" is reserved for the published content`
                  return VARIANT_ID_PATTERN.test(value)
                    ? true
                    : 'Use letters, numbers, "-" and "_" only'
                }),
            }),
            defineField({
              name: 'weight',
              title: 'Traffic',
              type: 'number',
              initialValue: 50,
              description: 'Relative share of visitors (see Control traffic).',
              validation: (rule) => rule.required().min(0),
            }),
          ],
          preview: {
            select: { id: 'variantId', weight: 'weight' },
            prepare: ({ id, weight }: { id?: string; weight?: number }) => ({
              title: id ?? 'No ID',
              subtitle: `Traffic ${weight ?? 0}`,
            }),
          },
        }),
      ],
      validation: (rule) => [
        rule.required().min(1).max(4),
        rule.custom((variants: { variantId?: string }[] | undefined) => {
          const ids = (variants ?? []).map(({ variantId }) => variantId)
          return new Set(ids).size === ids.length ? true : 'Each variant ID can be used once'
        }),
        rule.custom((variants: { weight?: number }[] | undefined, context) => {
          const control = (context.document as { controlWeight?: number } | undefined)
            ?.controlWeight
          const total = (control ?? 0) + (variants ?? []).reduce((n, v) => n + (v.weight ?? 0), 0)
          return total > 0 ? true : 'Give at least one option some traffic'
        }),
      ],
    }),
  ],
  preview: {
    select: { name: 'name', active: 'active', variants: 'variants' },
    prepare: ({
      name,
      active,
      variants,
    }: {
      name?: string
      active?: boolean
      variants?: unknown[]
    }) => ({
      title: name ?? 'Untitled experiment',
      subtitle: `${active ? 'Running' : 'Stopped'} · control + ${variants?.length ?? 0}`,
    }),
  },
})
