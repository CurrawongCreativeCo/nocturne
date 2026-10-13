import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField, imageOptions } from './image-field'

/**
 * Rich text. Use as `type: 'blockContent'` and query with `portableTextFields`
 * (lib/sanity/fragments.ts), which resolves internal links and image assets.
 */
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Rich text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullets', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Code', value: 'code' },
        ],
        annotations: [defineArrayMember({ name: 'link', type: 'link' })],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: imageOptions,
      fields: [altField({ required: true }), defineField({ name: 'caption', type: 'string' })],
    }),
  ],
})
