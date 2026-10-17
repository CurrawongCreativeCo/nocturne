import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

/** Panel content: one of the site's forms (Reusable content, Forms). */
export const panelForm = defineType({
  name: 'panelForm',
  title: 'Form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'form',
      type: 'reference',
      to: [{ type: 'form' }],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'form.title' },
    prepare: ({ title }: { title?: string }) => ({
      title: title || 'Choose a form',
      subtitle: 'Form',
    }),
  },
})
