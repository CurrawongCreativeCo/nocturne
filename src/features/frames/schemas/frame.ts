import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType } from 'sanity'

import { CUSTOM_FRAME_MAX_BYTES } from '@/lib/sanity/image-design-options'

import { checkFrameSvg } from '../utils/frame-svg'

interface FrameAsset {
  url?: string
  size?: number
  mimeType?: string
}

/**
 * An approved custom frame for a picture (README, "Image design"): an SVG outline the agency has
 * checked. Only agency staff see and create these (the Studio structure and "New document" menu hide
 * them from clients), and an `imageDesign` can only point at one of them, so every custom frame on
 * the site has been through here. The site uses the file as a CSS mask in a theme colour; it is
 * never inlined, so it cannot run a script.
 */
export const frame = defineType({
  name: 'frame',
  title: 'Frame',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'What editors see in the list, e.g. "Hand-drawn leaf border".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'svg',
      title: 'SVG file',
      type: 'file',
      description: `A single-colour outline that surrounds the picture, as an SVG with a viewBox, under ${CUSTOM_FRAME_MAX_BYTES / 1024} KB. The site fills it with a theme colour, so any colour in the file is ignored; the transparent middle shows the picture.`,
      options: { accept: '.svg,image/svg+xml' },
      validation: (rule) =>
        rule
          .required()
          .custom(async (value, { getClient }) => {
            const ref = value?.asset?._ref
            if (!ref) return true
            try {
              const asset = await getClient({ apiVersion: '2025-01-01' }).fetch<FrameAsset | null>(
                '*[_id == $id][0]{url, size, mimeType}',
                { id: ref },
              )
              // Still processing: the check runs again when the document changes.
              if (!asset?.url) return true
              if (asset.mimeType && asset.mimeType !== 'image/svg+xml') {
                return 'This is not an SVG file. Upload an .svg exported from your design tool.'
              }
              const text = await (await fetch(asset.url)).text()
              return checkFrameSvg(text, asset.size ?? text.length)
            } catch {
              // Offline or blocked: don't stop the agency from saving.
              return true
            }
          })
          .error(),
    }),
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({
      title: title || 'Untitled frame',
      subtitle: 'SVG frame',
    }),
  },
})
