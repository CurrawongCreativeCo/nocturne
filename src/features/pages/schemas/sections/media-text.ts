import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageDesignField } from '@/lib/sanity/schema/image-design'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

import { IMAGE_SIDE_TITLES, imageSideOptions } from './image-side'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in half the content width.
  title: 60,
  // Small label above the title.
  eyebrow: 30,
} as const

export const mediaText = defineType({
  name: 'mediaText',
  title: 'Image + text',
  type: 'object',
  icon: SplitHorizontalIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'eyebrow',
        type: 'string',
        description: 'Small label above the title.',
        validation: (rule) => lengthWarning(rule, LIMITS.eyebrow, 'Labels'),
      }),
      headingField({
        name: 'heading',
        title: 'Title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({ name: 'body', type: 'blockContent' }),
      defineField({
        name: 'ctas',
        title: 'Calls to action',
        type: 'array',
        of: [defineArrayMember({ type: 'cta' })],
        validation: (rule) => rule.max(2),
      }),
      imageField({ name: 'image', aspect: '4:3', minWidth: 1600 }),
      // Shape, motion inside the frame and decorative frames: agency only, in the Design tab.
      imageDesignField(),
      defineField({
        name: 'imagePosition',
        title: 'Image side',
        description:
          'Which side the picture sits on wide screens. On phones it sits below the text.',
        type: 'string',
        initialValue: 'right',
        options: imageSideOptions,
        validation: (rule) => rule.required(),
      }),
      accessField,
    ],
    { align: 'start' },
    // The picture is always there, so Parallax always has something to move.
    { rules: { type: 'mediaText', hasPicture: () => true } },
  ),
  preview: {
    select: {
      heading: 'heading',
      title: 'title',
      media: 'image',
      side: 'imagePosition',
      tone: 'style.tone',
    },
    prepare: ({
      heading,
      title,
      media,
      side,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      media?: PreviewValue['media']
      side?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Untitled',
      // "Image + text · Image left · Tinted": the side is the one layout choice editors make here.
      subtitle: joinSubtitle('Image + text', IMAGE_SIDE_TITLES[side ?? 'right'], toneTitle(tone)),
      media,
    }),
  },
})
