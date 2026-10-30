import { PlayIcon } from '@sanity/icons/Play'
import { defineField, defineType, type PreviewValue } from 'sanity'

import { hiddenFromClients } from '@/lib/sanity/roles'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'

import { ASPECT_RATIOS, PROVIDER_NAMES, VIDEO_SOURCES, parseVideoUrl } from '../utils/video-source'

/** Longest text the design handles. Longer text still publishes, with a warning. */
export const SLOT_VIDEO_LIMITS = {
  // Names the Play button; it is never drawn on the page.
  title: 70,
} as const

type Parent = { source?: string } | undefined

/** An unset source is YouTube, the first option and the default. */
const sourceOf = (parent: Parent) => parent?.source ?? 'youtube'

/**
 * A video for a slot (README, "Adding a slot block"): the Video section's click-to-load YouTube and
 * Vimeo player, or an uploaded MP4 with captions, without the section around it. Content (the video,
 * its poster, captions and title) is the client's to change; the Shape is the agency's.
 */
export const slotVideo = defineType({
  name: 'slotVideo',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'Names the Play button for screen readers: “Play video: <title>”.',
      validation: (rule) => [
        rule.required(),
        lengthWarning(rule, SLOT_VIDEO_LIMITS.title, 'Titles'),
      ],
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
      validation: (rule) => rule.required(),
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
      description: 'An MP4 (H.264).',
      options: { accept: 'video/mp4' },
      hidden: ({ parent }) => sourceOf(parent as Parent) !== 'upload',
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          sourceOf(parent as Parent) !== 'upload' || value?.asset ? true : 'Upload an MP4 file',
        ),
    }),
    imageField({
      name: 'poster',
      title: 'Poster image',
      aspect: '16:9',
      minWidth: 1200,
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
    // Layout: the agency's call, so a client cannot squash the video out of its slot.
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
      hidden: hiddenFromClients,
    }),
  ],
  preview: {
    select: { title: 'title', source: 'source', media: 'poster' },
    prepare: ({
      title,
      source,
      media,
    }: {
      title?: string
      source?: string
      media?: PreviewValue['media']
    }) => ({
      title: title || 'Video',
      subtitle: VIDEO_SOURCES.find((option) => option.value === source)?.title ?? 'Video',
      media,
    }),
  },
})
