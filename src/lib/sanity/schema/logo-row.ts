import { ImagesIcon } from '@sanity/icons/Images'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from './image-field'

/** How many logos a row holds: past six they shrink to nothing on a phone. */
export const LOGO_ROW_ITEMS = { min: 1, max: 6 } as const

/**
 * Up to six logos in a single quiet row ("As seen in", "Our clients"), for the hero's supporting slot.
 * Greyscale (the default) keeps mixed brand colours from competing with the heading. It takes the tone
 * of whatever it sits in.
 */
export const logoRow = defineType({
  name: 'logoRow',
  title: 'Logos',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'logos',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'logo',
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              type: 'string',
              description: 'The company, read aloud by screen readers.',
              validation: (rule) => rule.required(),
            }),
            imageField({
              name: 'image',
              requireAlt: false,
              description: 'SVG or transparent PNG.',
              preferSvg: true,
              minWidth: 400,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: 'name', media: 'image' } },
        }),
      ],
      validation: (rule) => rule.required().min(LOGO_ROW_ITEMS.min).max(LOGO_ROW_ITEMS.max),
    }),
    defineField({
      name: 'greyscale',
      title: 'Greyscale',
      type: 'boolean',
      description: 'Shows the logos in grey so they sit quietly. Turn off to keep their colours.',
      initialValue: true,
    }),
  ],
  preview: {
    select: { logos: 'logos' },
    prepare: ({ logos }: { logos?: unknown[] }) => ({
      title: 'Logos',
      subtitle: `${logos?.length ?? 0} logos`,
    }),
  },
})
