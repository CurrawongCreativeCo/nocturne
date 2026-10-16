import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

export const eventCategory = defineType({
  name: 'eventCategory',
  title: 'Event category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'e.g. “Workshop”, “Open day”, “Talk”. Shown on the event cards.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: 'title' } },
})
