import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({
      name: 'ctas',
      title: 'Calls to action',
      type: 'array',
      of: [defineArrayMember({ type: 'cta' })],
      validation: (rule) => rule.max(2),
    }),
    imageField({ name: 'backgroundImage', requireAlt: false }),
    defineField({
      name: 'showGreeting',
      title: 'Greet returning visitors',
      description: 'Shows a short "Welcome back" to people who have visited before.',
      type: 'boolean',
      initialValue: false,
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title', media: 'backgroundImage' },
    prepare: ({ title, media }: { title?: string; media?: PreviewValue['media'] }) => ({
      title: title || 'Untitled',
      subtitle: 'Hero',
      media,
    }),
  },
})
