import { InboxIcon } from '@sanity/icons/Inbox'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { ENQUIRY_STATUSES } from '../utils/build-enquiry'

const STATUS_TITLES: Record<(typeof ENQUIRY_STATUSES)[number], string> = {
  new: 'New',
  read: 'Read',
  archived: 'Archived',
}

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : ''

/**
 * A form submission, stored by `submitForm` when `ENQUIRIES_STORE=1` (README, "Enquiries"). It holds
 * personal details, so it never appears on the site: no page query selects it. Everything is
 * read-only except the status. `liveEdit` means no drafts: changing the status saves at once, with
 * nothing to publish, and the weekly retention workflow deletes by age.
 */
export const enquiry = defineType({
  name: 'enquiry',
  title: 'Enquiry',
  type: 'document',
  icon: InboxIcon,
  liveEdit: true,
  fields: [
    defineField({
      name: 'status',
      type: 'string',
      description: 'Move an enquiry through New, Read and Archived to keep track of it.',
      options: {
        list: ENQUIRY_STATUSES.map((value) => ({ value, title: STATUS_TITLES[value] })),
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'new',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formTitle',
      title: 'Form',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'form',
      title: 'Form document',
      type: 'reference',
      to: [{ type: 'form' }],
      weak: true,
      readOnly: true,
      description: 'Empty once the form has been deleted; the form’s name is kept above.',
    }),
    defineField({
      name: 'fields',
      title: 'Answers',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', readOnly: true }),
            defineField({ name: 'value', type: 'text', rows: 3, readOnly: true }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        }),
      ],
    }),
    defineField({ name: 'pagePath', title: 'Sent from page', type: 'string', readOnly: true }),
    defineField({ name: 'createdAt', title: 'Received', type: 'datetime', readOnly: true }),
    defineField({
      name: 'attribution',
      title: 'Where they came from',
      type: 'object',
      readOnly: true,
      description: 'The referrer and campaign links, when the visitor’s browser shared them.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'referrer', type: 'string', readOnly: true }),
        defineField({ name: 'utmSource', title: 'UTM source', type: 'string', readOnly: true }),
        defineField({ name: 'utmMedium', title: 'UTM medium', type: 'string', readOnly: true }),
        defineField({
          name: 'utmCampaign',
          title: 'UTM campaign',
          type: 'string',
          readOnly: true,
        }),
        defineField({ name: 'utmTerm', title: 'UTM term', type: 'string', readOnly: true }),
        defineField({ name: 'utmContent', title: 'UTM content', type: 'string', readOnly: true }),
      ],
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'newest', by: [{ field: 'createdAt', direction: 'desc' }] },
    { title: 'Oldest first', name: 'oldest', by: [{ field: 'createdAt', direction: 'asc' }] },
  ],
  preview: {
    select: {
      name: 'fields.0.value',
      formTitle: 'formTitle',
      status: 'status',
      createdAt: 'createdAt',
    },
    prepare: ({
      name,
      formTitle,
      status,
      createdAt,
    }: {
      name?: string
      formTitle?: string
      status?: keyof typeof STATUS_TITLES
      createdAt?: string
    }) => ({
      title: name || formTitle || 'Enquiry',
      subtitle: [STATUS_TITLES[status ?? 'new'], formatDate(createdAt), formTitle]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
