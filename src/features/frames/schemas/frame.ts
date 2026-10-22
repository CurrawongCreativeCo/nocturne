import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType } from 'sanity'

import {
  CUSTOM_FRAME_MAX_BYTES,
  CUSTOM_FRAME_PICTURE_MAX_BYTES,
  CUSTOM_FRAME_PICTURE_MIN_SIZE,
} from '@/lib/sanity/image-design-options'
import type { FRAME_PICTURE_ASSET_QUERY_RESULT } from '@/types/sanity.types'

import { FRAME_PICTURE_ASSET_QUERY } from '../api/queries'
import { checkFramePicture, framePictureWarning } from '../utils/frame-picture'
import { checkFrameSvg } from '../utils/frame-svg'

interface FrameAsset {
  url?: string
  size?: number
  mimeType?: string
}

/**
 * An approved custom frame for a picture (README, "Image design"): artwork the agency has
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
  initialValue: { format: 'svg' },
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'What editors see in the list, e.g. "Hand-drawn leaf border".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'format',
      title: 'Artwork',
      type: 'string',
      description: 'Use Picture for detailed hand-drawn artwork. Existing frames use SVG file.',
      options: {
        list: [
          { title: 'SVG file', value: 'svg' },
          { title: 'Picture', value: 'picture' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'svg',
      title: 'SVG file',
      type: 'file',
      description: `A single-colour outline that surrounds the picture, as an SVG with a viewBox, under ${CUSTOM_FRAME_MAX_BYTES / 1024} KB. The site fills it with a theme colour, so any colour in the file is ignored; the transparent middle shows the picture.`,
      options: { accept: '.svg,image/svg+xml' },
      hidden: ({ document }) => document?.format === 'picture',
      validation: (rule) =>
        rule
          .custom(async (value, { getClient, document }) => {
            if (document?.format === 'picture') return true
            const ref = value?.asset?._ref
            if (!ref) return 'Upload an SVG file.'
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
    defineField({
      name: 'picture',
      title: 'Picture',
      type: 'image',
      description: `A single-colour outline on a transparent background, PNG or WebP, at least ${CUSTOM_FRAME_PICTURE_MIN_SIZE} px on the long side (1600–2400 px recommended), up to ${CUSTOM_FRAME_PICTURE_MAX_BYTES / 1024 / 1024} MB. Keep the middle transparent. The site applies the frame colour and downloads a resized WebP.`,
      options: { accept: 'image/png,image/webp', hotspot: false },
      hidden: ({ document }) => document?.format !== 'picture',
      validation: (rule) => [
        rule.custom(async (value, { document, getClient }) => {
          if (document?.format !== 'picture') return true
          const ref = value?.asset?._ref
          if (!ref) return 'Upload a transparent PNG or WebP.'
          try {
            const asset = await getClient({
              apiVersion: '2025-01-01',
            }).fetch<FRAME_PICTURE_ASSET_QUERY_RESULT>(FRAME_PICTURE_ASSET_QUERY, { id: ref })
            return checkFramePicture(asset)
          } catch {
            return true
          }
        }),
        rule
          .custom(async (value, { document, getClient }) => {
            if (document?.format !== 'picture' || !value?.asset?._ref) return true
            try {
              const asset = await getClient({
                apiVersion: '2025-01-01',
              }).fetch<FRAME_PICTURE_ASSET_QUERY_RESULT>(FRAME_PICTURE_ASSET_QUERY, {
                id: value.asset._ref,
              })
              return framePictureWarning(asset)
            } catch {
              return true
            }
          })
          .warning(),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', format: 'format', picture: 'picture' },
    prepare: ({
      title,
      format,
      picture,
    }: {
      title?: string
      format?: string
      picture?: unknown
    }) => ({
      title: title || 'Untitled frame',
      subtitle: format === 'picture' ? 'Picture frame' : 'SVG frame',
      media: format === 'picture' ? (picture as never) : ImageIcon,
    }),
  },
})
