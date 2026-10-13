import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

export const formSection = defineType({
  name: 'formSection',
  title: 'Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: 'title', title: 'Section title', type: 'string' }),
    defineField({ name: 'text', title: 'Intro', type: 'text', rows: 3 }),
    defineField({
      name: 'form',
      type: 'reference',
      to: [{ type: 'form' }],
      description: 'Create forms under Forms in the sidebar. One form can be used on many pages.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', form: 'form.title' },
    prepare: ({ title, form }: { title?: string; form?: string }) => ({
      title: title || form || 'Form',
      subtitle: form ? `Form · ${form}` : 'Form · none chosen',
    }),
  },
})
