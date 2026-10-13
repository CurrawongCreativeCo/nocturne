import { CreditCardIcon } from '@sanity/icons/CreditCard'
import { defineField, defineType } from 'sanity'

import { formatInterval, formatPrice } from '@/lib/format-price'

import { PRICE_INTERVALS } from '../types'

/**
 * A price in Stripe, mirrored here by the Stripe webhook so editors can pick it in a pricing table.
 * Read-only in Studio: change a price in the Stripe dashboard and the webhook updates this copy.
 */
export const stripePrice = defineType({
  name: 'stripePrice',
  title: 'Stripe price',
  type: 'document',
  icon: CreditCardIcon,
  readOnly: true,
  fields: [
    defineField({ name: 'productName', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'priceId',
      title: 'Price ID',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'productId',
      title: 'Product ID',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'amount',
      type: 'number',
      description: 'In the currency’s smallest unit, as Stripe reports it (1900 = $19.00).',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'currency',
      type: 'string',
      description: 'Lowercase ISO code, e.g. usd.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'interval',
      type: 'string',
      description: 'Empty for a one-time price.',
      options: { list: [...PRICE_INTERVALS] },
    }),
    defineField({
      name: 'intervalCount',
      type: 'number',
      description: 'Billed every this many intervals.',
      initialValue: 1,
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'active',
      type: 'boolean',
      description: 'Archived prices stay here but are left out of pricing tables.',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      name: 'productName',
      priceId: 'priceId',
      amount: 'amount',
      currency: 'currency',
      interval: 'interval',
      intervalCount: 'intervalCount',
      active: 'active',
    },
    prepare: ({
      name,
      priceId,
      amount,
      currency,
      interval,
      intervalCount,
      active,
    }: {
      name?: string
      priceId?: string
      amount?: number
      currency?: string
      interval?: string
      intervalCount?: number
      active?: boolean
    }) => ({
      title: name || priceId || 'Stripe price',
      subtitle: [
        amount !== undefined && currency
          ? `${formatPrice({ amount, currency })} ${formatInterval(interval, intervalCount)}`.trim()
          : '',
        active === false ? 'inactive' : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
