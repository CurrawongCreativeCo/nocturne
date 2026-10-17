import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { formatInterval, formatPrice } from '@/lib/format-price'
import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

interface PlanValue {
  highlighted?: boolean
}

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
} as const

export const pricingTable = defineType({
  name: 'pricingTable',
  title: 'Pricing table',
  type: 'object',
  icon: CreditCardIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
      defineField({
        name: 'plans',
        type: 'array',
        description:
          'One card per plan, in this order. Prices come from Stripe: add or change them in the Stripe dashboard and they appear here after the webhook runs.',
        validation: (rule) =>
          rule
            .required()
            .min(1)
            .max(4)
            .custom((plans?: PlanValue[]) =>
              (plans ?? []).filter((plan) => plan.highlighted).length > 1
                ? 'Highlight at most one plan.'
                : true,
            ),
        of: [
          defineArrayMember({
            name: 'plan',
            type: 'object',
            fields: [
              defineField({
                name: 'price',
                type: 'reference',
                to: [{ type: 'stripePrice' }],
                // Archived prices can't be bought, so they aren't offered.
                options: { filter: 'active == true' },
                description: 'The Stripe price this plan sells. Visitors check out with it.',
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: 'name',
                title: 'Plan name',
                type: 'string',
                description: 'Leave empty to use the product name from Stripe.',
              }),
              defineField({
                name: 'features',
                type: 'array',
                of: [defineArrayMember({ type: 'string' })],
                description: 'What this plan includes, one line each.',
              }),
              defineField({
                name: 'highlighted',
                title: 'Highlight this plan',
                type: 'boolean',
                description:
                  'Marks it “Most popular” with a stronger outline. Only one plan can be.',
                initialValue: false,
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: 'ctaLabel',
                title: 'Button text',
                type: 'string',
                description: 'Defaults to “Get started”.',
              }),
            ],
            preview: {
              select: {
                name: 'name',
                productName: 'price.productName',
                amount: 'price.amount',
                currency: 'price.currency',
                interval: 'price.interval',
                intervalCount: 'price.intervalCount',
                highlighted: 'highlighted',
              },
              prepare: ({
                name,
                productName,
                amount,
                currency,
                interval,
                intervalCount,
                highlighted,
              }: {
                name?: string
                productName?: string
                amount?: number
                currency?: string
                interval?: string
                intervalCount?: number
                highlighted?: boolean
              }) => ({
                title: name || productName || 'Choose a price',
                subtitle: [
                  amount !== undefined && currency
                    ? `${formatPrice({ amount, currency })} ${formatInterval(interval, intervalCount)}`.trim()
                    : '',
                  highlighted ? 'highlighted' : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
              }),
            },
          }),
        ],
      }),
      accessField,
    ],
    { align: 'center' },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', plans: 'plans', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      plans,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      plans?: unknown[]
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Pricing table',
      subtitle: joinSubtitle('Pricing table', `${plans?.length ?? 0} plans`, toneTitle(tone)),
    }),
  },
})
