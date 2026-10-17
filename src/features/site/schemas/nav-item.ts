import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

export const navItem = defineType({
  name: 'navItem',
  title: 'Menu link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      description: 'The words in the menu. One or two words read best.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'link', type: 'link', validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: 'label' } },
})
