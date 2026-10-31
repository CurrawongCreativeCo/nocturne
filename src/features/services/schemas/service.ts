import { CaseIcon } from '@sanity/icons/Case'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

import { SERVICE_SLUG_PATTERN, slugifyService } from '../utils/slug'

/** Longest summary: it is the page's meta description and the search snippet. */
export const SERVICE_SUMMARY_MAX = 160

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  icon: CaseIcon,
  fieldsets: [
    {
      name: 'price',
      title: 'Price',
      description:
        'Optional. Shown on the page as “From $150 per hour”. Leave both empty to show no price.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      description: 'The service’s page is at /services/<address>.',
      options: { source: 'name', slugify: slugifyService },
      validation: (rule) =>
        rule
          .required()
          .custom((slug) =>
            !slug?.current || SERVICE_SLUG_PATTERN.test(slug.current)
              ? true
              : 'Lowercase letters, numbers and hyphens only (no "/")',
          ),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: `One or two sentences on what the service is. Shown under the heading and used as the page’s description. ${SERVICE_SUMMARY_MAX} characters at most.`,
      validation: (rule) =>
        rule
          .required()
          .max(SERVICE_SUMMARY_MAX)
          .error(`Keep the summary to ${SERVICE_SUMMARY_MAX} characters or fewer`),
    }),
    imageField({
      name: 'image',
      aspect: '16:9',
      minWidth: 1200,
      description: 'Shown beside the summary and when the page is shared. Alt text is required.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Full description',
      type: 'blockContent',
      description: 'The full description: what is included, how it works, what to expect.',
    }),
    defineField({
      name: 'audience',
      title: 'Who it’s for',
      type: 'text',
      rows: 3,
      description: 'Optional. Who gets the most out of this service. Shown under “Who it’s for”.',
    }),
    defineField({
      name: 'priceFrom',
      title: 'From price (AUD)',
      type: 'number',
      fieldset: 'price',
      description: 'The lowest price in Australian dollars, e.g. 150.',
      validation: (rule) =>
        rule
          .min(0)
          .precision(2)
          .custom((value, { document }) =>
            value === undefined && (document as { priceUnit?: string } | undefined)?.priceUnit
              ? 'Add the price, or clear the unit'
              : true,
          ),
    }),
    defineField({
      name: 'priceUnit',
      title: 'Price unit',
      type: 'string',
      fieldset: 'price',
      description: 'What the price is for, e.g. “per hour”, “per project”, “per month”.',
      validation: (rule) =>
        rule.custom((value, { document }) =>
          typeof (document as { priceFrom?: number } | undefined)?.priceFrom === 'number' && !value
            ? 'A price needs a unit, so visitors know what it covers'
            : true,
        ),
    }),
    defineField({
      name: 'faqs',
      title: 'Questions and answers',
      type: 'array',
      description: 'Common questions about this service. Shown on its page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'serviceFaq',
          fields: [
            defineField({
              name: 'question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              type: 'text',
              rows: 4,
              description: 'Plain text. Keep it short and direct.',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: 'question', subtitle: 'answer' } },
        }),
      ],
    }),
    defineField({
      name: 'evidence',
      title: 'Proof of work',
      type: 'array',
      description: 'Case studies or pages that show this service in action. Shown as links.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'post' }, { type: 'page' }] })],
      validation: (rule) => rule.unique(),
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'summary', media: 'image' },
  },
})
