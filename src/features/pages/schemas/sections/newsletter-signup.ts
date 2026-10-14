import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionGroups } from '@/lib/sanity/schema/section-style'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in max-w-measure-narrow.
  title: 60,
  // text-lead in max-w-measure-narrow: about four lines.
  text: 200,
} as const

export const newsletterSignup = defineType({
  name: 'newsletterSignup',
  title: 'Newsletter signup',
  type: 'object',
  icon: EnvelopeIcon,
  groups: sectionGroups,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Heading',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'text',
        type: 'text',
        rows: 3,
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Intro text'),
      }),
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
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({
      title: title || 'Untitled',
      subtitle: 'Newsletter signup',
    }),
  },
})
