import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in max-w-measure-narrow.
  title: 60,
  // text-lead in max-w-measure-narrow: about four lines.
  text: 200,
} as const

export const formSection = defineType({
  name: 'formSection',
  title: 'Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Section title',
      type: 'string',
      validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
    }),
    defineField({
      name: 'text',
      title: 'Intro',
      type: 'text',
      rows: 3,
      validation: (rule) => lengthWarning(rule, LIMITS.text, 'Intro text'),
    }),
    defineField({
      name: 'form',
      type: 'reference',
      to: [{ type: 'form' }],
      description: 'Create forms under Forms in the sidebar. One form can be used on many pages.',
      validation: (rule) => rule.required(),
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title', form: 'form.title' },
    prepare: ({ title, form }: { title?: string; form?: string }) => ({
      title: title || form || 'Form',
      subtitle: form ? `Form · ${form}` : 'Form · none chosen',
    }),
  },
})
