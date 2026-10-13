import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { FIELD_NAME_PATTERN, FIELD_TYPES } from '../utils/field-types'

interface FieldValue {
  name?: string
}

export const form = defineType({
  name: 'form',
  title: 'Form',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'Internal name, shown when picking this form. It is also the email subject.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fields',
      type: 'array',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .max(20)
          .custom((items?: FieldValue[]) => {
            const seen = new Set<string>()
            for (const { name } of items ?? []) {
              if (!name) continue
              if (seen.has(name)) return `Two fields are called "${name}". Names must be unique.`
              seen.add(name)
            }
            return true
          }),
      of: [
        defineArrayMember({
          name: 'formField',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              description: 'What visitors see above the field.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'name',
              type: 'string',
              description:
                'Internal name used in the email, e.g. email or phone_number. Start with a lowercase letter; then letters, numbers and _ only. Don’t change it once the form is live.',
              validation: (rule) =>
                rule
                  .required()
                  .regex(FIELD_NAME_PATTERN)
                  .error(
                    'Start with a lowercase letter, then use only letters, numbers and underscores.',
                  ),
            }),
            defineField({
              name: 'type',
              type: 'string',
              options: { list: [...FIELD_TYPES], layout: 'dropdown' },
              initialValue: 'text',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'required',
              type: 'boolean',
              description: 'Visitors can’t send the form without this.',
              initialValue: false,
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'options',
              title: 'Choices',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'select',
              validation: (rule) =>
                rule.custom((choices: string[] | undefined, context) => {
                  const { type } = context.parent as { type?: string }
                  if (type !== 'select') return true
                  if (!choices?.length) return 'A drop-down list needs at least one choice.'
                  if (new Set(choices).size !== choices.length) return 'Choices must be different.'
                  return true
                }),
            }),
          ],
          preview: {
            select: { title: 'label', type: 'type', required: 'required' },
            prepare: ({
              title,
              type,
              required,
            }: {
              title?: string
              type?: string
              required?: boolean
            }) => ({
              title: title || 'Untitled field',
              subtitle: `${FIELD_TYPES.find((t) => t.value === type)?.title ?? type ?? ''}${required ? ' · required' : ''}`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'submitLabel',
      title: 'Button text',
      type: 'string',
      initialValue: 'Send',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'successMessage',
      type: 'text',
      rows: 3,
      description: 'Shown in place of the form after it has been sent.',
      initialValue: 'Thanks! Your message has been sent.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'recipientEmail',
      title: 'Send submissions to',
      type: 'string',
      description:
        'Where each submission is emailed. It is never shown on the site, but anyone who can read your dataset can read it, so prefer a shared inbox.',
      validation: (rule) => rule.required().email(),
    }),
  ],
  preview: {
    select: { title: 'title', fields: 'fields', to: 'recipientEmail' },
    prepare: ({ title, fields, to }: { title?: string; fields?: unknown[]; to?: string }) => ({
      title: title || 'Untitled',
      subtitle: `${fields?.length ?? 0} fields${to ? ` → ${to}` : ''}`,
    }),
  },
})
