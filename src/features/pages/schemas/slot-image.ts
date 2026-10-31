import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType, type PreviewValue } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

/**
 * A picture for a slot (README, "Adding a slot block"): the Image + text section's media, now that the
 * media slot also takes a video. Its shape, frame and movement stay the section's Image design
 * (agency only), so the block holds nothing but the picture and its alt text.
 */
export const slotImage = defineType({
  name: 'slotImage',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      ...imageField({ name: 'image', aspect: '4:3', minWidth: 1600 }),
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { media: 'image', alt: 'image.alt' },
    prepare: ({ media, alt }: { media?: PreviewValue['media']; alt?: string }) => ({
      title: alt || 'Image',
      subtitle: 'Image',
      media,
    }),
  },
})
