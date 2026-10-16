import { PlayIcon } from '@sanity/icons/Play'
import { defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  VideoAmbientThumbnail,
  VideoEmbedThumbnail,
} from '@/lib/sanity/schema/thumbnails/video-thumbnails'

import {
  ambientSizeProblem,
  ASPECT_RATIOS,
  PROVIDER_NAMES,
  VIDEO_SOURCES,
  parseVideoUrl,
} from '../../utils/video-source'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 over the full content width.
  title: 70,
  // One short paragraph under the video.
  text: 220,
} as const

/**
 * One component per variant in components/sections/video/. The first is the default: a click-to-load
 * embed, and what content without a variant renders. Ambient needs an uploaded MP4.
 */
export const VIDEO_VARIANTS = [
  {
    value: 'embed',
    title: 'Embed',
    description: 'A poster and a Play button. YouTube, Vimeo or an uploaded video loads on click.',
    thumbnail: VideoEmbedThumbnail,
  },
  {
    value: 'ambient',
    title: 'Ambient',
    description: 'A short, silent, looping uploaded video behind the words, with a Pause button.',
    thumbnail: VideoAmbientThumbnail,
  },
] as const

type Parent = { variant?: string; source?: string } | undefined

/** Ambient plays an uploaded file, so there is no source to choose. */
const isAmbient = (parent: Parent) => parent?.variant === 'ambient'
/** An unset source is YouTube, the first option and the default. */
const sourceOf = (parent: Parent) => (isAmbient(parent) ? 'upload' : (parent?.source ?? 'youtube'))

/** The size of an uploaded file, read once per asset per Studio session (assets never change). */
const sizeCache = new Map<string, Promise<number | undefined>>()

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        description: 'Also names the Play button for screen readers: “Play video: <title>”.',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'text',
        title: 'Description',
        type: 'text',
        rows: 3,
        description: 'Optional. Shown with the video.',
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Descriptions'),
      }),
      defineField({
        name: 'source',
        type: 'string',
        initialValue: 'youtube',
        options: {
          list: VIDEO_SOURCES.map(({ value, title }) => ({ value, title })),
          layout: 'radio',
          direction: 'horizontal',
        },
        hidden: ({ parent }) => isAmbient(parent as Parent),
        validation: (rule) =>
          rule.custom((value, { parent }) =>
            isAmbient(parent as Parent) || value ? true : 'Choose where the video plays from',
          ),
      }),
      defineField({
        name: 'url',
        title: 'Video address',
        type: 'url',
        description: 'Paste the address from the browser: a YouTube or Vimeo link.',
        hidden: ({ parent }) => !['youtube', 'vimeo'].includes(sourceOf(parent as Parent)),
        validation: (rule) =>
          rule.custom((value, { parent }) => {
            const source = sourceOf(parent as Parent)
            if (source !== 'youtube' && source !== 'vimeo') return true
            if (!value) return 'Paste the video’s address'
            const parsed = parseVideoUrl(value)
            if (!parsed) return `This doesn’t look like a ${PROVIDER_NAMES[source]} video address`
            return parsed.provider === source
              ? true
              : `This is a ${PROVIDER_NAMES[parsed.provider]} address: choose ${PROVIDER_NAMES[parsed.provider]} above`
          }),
      }),
      defineField({
        name: 'file',
        title: 'Video file',
        type: 'file',
        description: 'An MP4 (H.264). For Ambient, keep it short, silent and under 5 MB.',
        options: { accept: 'video/mp4' },
        hidden: ({ parent }) => sourceOf(parent as Parent) !== 'upload',
        validation: (rule) => [
          rule.custom((value, { parent }) =>
            sourceOf(parent as Parent) !== 'upload' || value?.asset ? true : 'Upload an MP4 file',
          ),
          rule
            .custom(async (value, { parent, getClient }) => {
              const ref = (value as { asset?: { _ref?: string } } | undefined)?.asset?._ref
              if (!ref || !isAmbient(parent as Parent)) return true
              let pending = sizeCache.get(ref)
              if (!pending) {
                pending = getClient({ apiVersion: '2025-01-01' })
                  .fetch<number | null>('*[_id == $id][0].size', { id: ref })
                  .then((size) => size ?? undefined)
                  .catch(() => undefined)
                sizeCache.set(ref, pending)
                void pending.then((size) => {
                  if (size === undefined) sizeCache.delete(ref)
                })
              }
              return ambientSizeProblem(await pending) ?? true
            })
            .warning(),
        ],
      }),
      imageField({
        name: 'poster',
        title: 'Poster image',
        aspect: '16:9',
        minWidth: 1600,
        description:
          'Shown before the video plays, and instead of it for visitors who ask for less motion.',
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'captions',
        title: 'Captions file',
        type: 'file',
        description:
          'A WebVTT (.vtt) file with captions, for an uploaded video. YouTube and Vimeo supply their own.',
        options: { accept: '.vtt,text/vtt' },
        hidden: ({ parent }) => sourceOf(parent as Parent) !== 'upload',
      }),
      defineField({
        name: 'aspectRatio',
        title: 'Shape',
        type: 'string',
        initialValue: '16:9',
        options: {
          list: ASPECT_RATIOS.map(({ value, title }) => ({ value, title })),
          layout: 'radio',
          direction: 'horizontal',
        },
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(VIDEO_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components.
    { align: 'start' },
    // No design option depends on the layout: the poster sits inside the frame or behind the words, and each layout accepts any alignment.
  ),
  preview: {
    select: { title: 'title', media: 'poster', variant: 'variant', tone: 'style.tone' },
    prepare: ({
      title,
      media,
      variant,
      tone,
    }: {
      title?: string
      media?: PreviewValue['media']
      variant?: string
      tone?: string
    }) => ({
      title: title || 'Untitled',
      subtitle: variantSubtitle('Video', VIDEO_VARIANTS, variant, tone),
      media,
    }),
  },
})
