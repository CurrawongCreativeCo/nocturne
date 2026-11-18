import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType, type PreviewValue } from 'sanity'

import { imageField, imageOptions } from '@/lib/sanity/schema/image-field'
import { framing } from '@/lib/sanity/schema/image-framing-option'

import { slotImageCapabilities } from './slot-image-capabilities'

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
  options: { designCapabilities: slotImageCapabilities },
  fields: [
    defineField({
      ...imageField({
        name: 'image',
        aspect: '4:3',
        minWidth: 1600,
        // "Adjust picture" (task 177): the Image + text section's shape (the block is allowed only there).
        options: { ...imageOptions, ...framing('mediaTextImage') },
      }),
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
