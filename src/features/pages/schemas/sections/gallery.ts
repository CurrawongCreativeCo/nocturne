import { ImagesIcon } from '@sanity/icons/Images'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  GalleryGridThumbnail,
  GalleryMasonryThumbnail,
  GallerySliderThumbnail,
} from '@/lib/sanity/schema/thumbnails/gallery-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
  // Under a full-size picture in the lightbox: a line or two.
  caption: 140,
} as const

/** The most pictures one gallery holds: a page full of them is slow, and a better fit for a blog post. */
const MAX_IMAGES = 60

/**
 * One component per variant in components/sections/gallery/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const GALLERY_VARIANTS = [
  {
    value: 'grid',
    title: 'Grid',
    description: 'Equal tiles in tidy rows.',
    thumbnail: GalleryGridThumbnail,
  },
  {
    value: 'masonry',
    title: 'Masonry',
    description: 'Pictures keep their own shape and pack into columns.',
    thumbnail: GalleryMasonryThumbnail,
  },
  {
    value: 'slider',
    title: 'Slider',
    description: 'A row to swipe, drag or step through.',
    thumbnail: GallerySliderThumbnail,
  },
] as const

// The array's pictures are plain `image`s (stored as `_type: "image"`), so the member is the shared
// image field without its name: a named member would store its name as the `_type`.
const { name: _name, ...pictureMember } = imageField({
  name: 'picture',
  title: 'Image',
  aspect: '4:3',
  minWidth: 1600,
  description: 'Click an image on the site to see it full screen, with its caption.',
  fields: [
    defineField({
      name: 'caption',
      type: 'string',
      description: 'Optional. Shown under the image when it is opened full screen.',
      validation: (rule) => lengthWarning(rule, LIMITS.caption, 'Captions'),
    }),
  ],
})

export const gallery = defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'object',
  icon: ImagesIcon,
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Section title',
        type: 'string',
        validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
      }),
      defineField({
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
      defineField({
        name: 'images',
        type: 'array',
        of: [defineArrayMember(pictureMember)],
        options: { layout: 'grid' },
        validation: (rule) => [rule.required().min(1), rule.max(MAX_IMAGES)],
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(GALLERY_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
    // Agency only, in the Design tab's collapsed Advanced area.
    {
      advanced: [
        defineField({
          name: 'columns',
          title: 'Columns',
          type: 'number',
          description: 'Pictures across on a wide screen. Narrower screens show fewer.',
          initialValue: 3,
          options: { list: [2, 3, 4], layout: 'radio', direction: 'horizontal' },
          validation: (rule) => rule.required().min(2).max(4),
        }),
      ],
    },
  ),
  preview: {
    select: { title: 'title', images: 'images', variant: 'variant', tone: 'style.tone' },
    prepare: ({
      title,
      images,
      variant,
      tone,
    }: {
      title?: string
      images?: unknown[]
      variant?: string
      tone?: string
    }) => ({
      title: title || 'Gallery',
      subtitle: joinSubtitle(
        variantSubtitle('Gallery', GALLERY_VARIANTS, variant, tone),
        `${images?.length ?? 0} images`,
      ),
    }),
  },
})
