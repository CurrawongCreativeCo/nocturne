import { UserIcon } from '@sanity/icons/User'
import { defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    imageField({ name: 'image', title: 'Photo', requireAlt: false }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 3,
      description: 'A sentence or two, shown under each of their posts.',
    }),
  ],
  preview: { select: { title: 'name', media: 'image' } },
})
