import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'

export const newsletterSignup = defineType({
  name: 'newsletterSignup',
  title: 'Newsletter signup',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'text', type: 'text', rows: 3 }),
    defineField({
      name: 'submitLabel',
      title: 'Button label',
      type: 'string',
      initialValue: 'Subscribe',
      validation: (rule) => rule.required().max(40),
    }),
    defineField({
      name: 'successMessage',
      type: 'text',
      rows: 3,
      description:
        'Shown after signing up. Visitors see it whether or not the address was already subscribed, so it should not say "you are now subscribed". If your provider asks people to confirm by email, say so here.',
      initialValue: 'Thanks! Check your inbox for a message from us.',
      validation: (rule) => rule.required().max(300),
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({
      title: title || 'Untitled',
      subtitle: 'Newsletter signup',
    }),
  },
})
