import { LaunchIcon } from '@sanity/icons/Launch'
import { defineField, defineType } from 'sanity'

export const cta = defineType({
  name: 'cta',
  title: 'Call to action',
  type: 'object',
  icon: LaunchIcon,
  fields: [
    defineField({ name: 'label', type: 'string', validation: (rule) => rule.required().max(40) }),
    defineField({ name: 'link', type: 'link', validation: (rule) => rule.required() }),
    defineField({
      name: 'variant',
      type: 'string',
      initialValue: 'primary',
      options: { list: ['primary', 'secondary'], layout: 'radio', direction: 'horizontal' },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'variant' },
  },
})
