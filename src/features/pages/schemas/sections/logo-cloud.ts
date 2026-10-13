import { ImagesIcon } from '@sanity/icons/Images'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'

export const logoCloud = defineType({
  name: 'logoCloud',
  title: 'Logo strip',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({ name: 'title', type: 'string', description: 'e.g. "Trusted by teams at"' }),
    defineField({
      name: 'logos',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'logo',
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
            imageField({
              name: 'image',
              requireAlt: false,
              description: 'SVG or transparent PNG.',
              validation: (rule) => rule.required(),
            }),
            defineField({ name: 'url', title: 'Link', type: 'url' }),
          ],
          preview: { select: { title: 'name', media: 'image' } },
        }),
      ],
    }),
    accessField,
  ],
  preview: {
    select: { title: 'title', logos: 'logos' },
    prepare: ({ title, logos }: { title?: string; logos?: unknown[] }) => ({
      title: title || 'Logo strip',
      subtitle: `Logo strip · ${logos?.length ?? 0} logos`,
    }),
  },
})
