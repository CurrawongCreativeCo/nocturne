import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { SLOTS } from '@/features/pages/slots/registry'
import { slotField } from '@/features/pages/slots/slot-field'
import { SPLIT_LAYOUTS } from '@/features/pages/utils/split-layout'
import { headingPlainText } from '@/lib/sanity/heading-text'
import { isClientView } from '@/lib/sanity/roles'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageDesignField } from '@/lib/sanity/schema/image-design'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { presetsOption } from '@/lib/sanity/schema/preset-field'
import { matchPreset } from '@/lib/sanity/schema/preset-match'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle, variantField } from '@/lib/sanity/schema/section-variant'
import {
  SplitMediaLeftThumbnail,
  SplitMediaRightThumbnail,
  SplitOverlayThumbnail,
  SplitStackedThumbnail,
} from '@/lib/sanity/schema/thumbnails/split-thumbnails'

import { imageSideOptions } from './image-side'

/** Longest text the design handles. Longer text still publishes, with a warning. */
export const LIMITS = {
  // text-h2 in half the content width.
  title: 60,
  // Small label above the title.
  eyebrow: 30,
} as const

/** The stored layouts (`variant`), with the names the list subtitle shows for a custom combination. */
export const SPLIT_VARIANTS = [
  {
    value: SPLIT_LAYOUTS[0],
    title: 'Side by side',
    description: 'Text on one side, media on the other.',
    thumbnail: SplitMediaRightThumbnail,
  },
  {
    value: SPLIT_LAYOUTS[1],
    title: 'Stacked',
    description: 'Media above the text.',
    thumbnail: SplitStackedThumbnail,
  },
  {
    value: SPLIT_LAYOUTS[2],
    title: 'Text over media',
    description: 'A picture behind the text.',
    thumbnail: SplitOverlayThumbnail,
  },
] as const

/**
 * The looks of Image + text: the preset bar above the form sets a layout and the options that go with
 * it in one click, and the bar names the preset the fields match (README, "Image + text"). Side by
 * side with the media on the right is a new section's look, and what content saved before layouts
 * existed renders. Presets never touch the tone of a layout that keeps the section's own, so choosing
 * one does not repaint a page; Text over media sets the dark tone its scrim is built for.
 */
export const SPLIT_PRESETS = [
  {
    value: 'media-right',
    title: 'Media right',
    description: 'Text on the left, media on the right.',
    thumbnail: SplitMediaRightThumbnail,
    set: { variant: 'side', imagePosition: 'right' },
  },
  {
    value: 'media-left',
    title: 'Media left',
    description: 'Media on the left, text on the right.',
    thumbnail: SplitMediaLeftThumbnail,
    set: { variant: 'side', imagePosition: 'left' },
  },
  {
    value: 'stacked',
    title: 'Stacked',
    description: 'Media above the text.',
    thumbnail: SplitStackedThumbnail,
    set: { variant: 'stacked' },
  },
  {
    value: 'text-over-media',
    title: 'Text over media',
    description: 'A picture behind the text. Dark.',
    thumbnail: SplitOverlayThumbnail,
    set: { variant: 'overlay', 'style.tone': 'inverse' },
  },
] as const

/** What an unset field means, so a section that was never touched still matches its preset (Media right). */
export const SPLIT_DEFAULTS = { variant: 'side', imagePosition: 'right' }

/** The field names the preset summary uses ("1 change (tone)"). */
export const SPLIT_PRESET_LABELS = {
  variant: 'layout',
  imagePosition: 'media side',
  'style.tone': 'tone',
}

/**
 * The list subtitle: "Image + text · Media left" when the fields match a preset, otherwise the layout
 * ("Image + text · Stacked · Tinted" with the tone, for a custom combination).
 */
export function splitSubtitle(fields: { variant?: string; imagePosition?: string; tone?: string }) {
  const preset = matchPreset(
    SPLIT_PRESETS,
    {
      variant: fields.variant,
      imagePosition: fields.imagePosition,
      style: { tone: fields.tone },
    },
    SPLIT_DEFAULTS,
  )
  // A preset that leaves the tone alone still shows it, as the list always did.
  if (preset) {
    return joinSubtitle(
      'Image + text',
      preset.title,
      preset.set.variant === 'overlay' ? undefined : toneTitle(fields.tone),
    )
  }
  const layout =
    SPLIT_VARIANTS.find((candidate) => candidate.value === (fields.variant ?? SPLIT_LAYOUTS[0])) ??
    SPLIT_VARIANTS[0]
  return joinSubtitle('Image + text', layout.title, toneTitle(fields.tone))
}

/** Text over media draws a picture, so the layout has a picture to move and a panel to sit on. */
const isOverlay = (section: { variant?: string }) => section.variant === SPLIT_LAYOUTS[2]

/** The side option means nothing when the media is above or behind the text. */
const notSide = ({ parent }: { parent?: { variant?: string } }) =>
  parent?.variant === SPLIT_LAYOUTS[1] || parent?.variant === SPLIT_LAYOUTS[2]

export const mediaText = defineType({
  name: 'mediaText',
  title: 'Image + text',
  type: 'object',
  icon: SplitHorizontalIcon,
  // The preset bar above the form: the one place to choose a look (README, "Image + text").
  options: {
    ...presetsOption(SPLIT_PRESETS, SPLIT_PRESET_LABELS),
    manifest: {
      purpose:
        'Media beside, above or behind a block of text, with an optional title, up to two buttons and one extra block such as a video. Use it to explain one idea with a picture or a video.',
      example: {
        eyebrow: 'Our story',
        title: 'Built on local knowledge',
        variant: 'side',
        imagePosition: 'left',
        style: { tone: 'alt' },
      },
    },
  },
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
      // The picture or video. One approved slot (README, "Adding a slot block"): the agency adds or
      // removes it, clients edit what is in it. Pictures saved before it existed stay in `image`,
      // below, and render until the "Image to media" migration has run (migrations/README.md).
      {
        ...slotField({ name: 'media', slot: 'split.media' }),
        validation: (rule) => [
          rule.max(SLOTS['split.media'].max),
          rule
            .custom((media, context) =>
              (context.parent as { variant?: string } | undefined)?.variant === SPLIT_LAYOUTS[2] &&
              (media as { _type?: string }[] | undefined)?.[0]?._type === 'slotVideo'
                ? 'Text over media needs a picture. A video is shown beside the text instead.'
                : true,
            )
            .warning(),
        ],
      },
      // Extra content under the media (side by side, stacked) or under the buttons (text over media).
      slotField({ name: 'supporting', slot: 'split.supporting' }),
      // Superseded by `media`. Shown only while the section has no media, so a picture that was
      // saved before the slot existed stays editable; a client with a new section can still add one.
      imageField({
        name: 'image',
        aspect: '4:3',
        minWidth: 1600,
        title: 'Image',
        description: 'Shown until Media above has a picture or a video.',
        requireAlt: true,
        hidden: ({ parent, currentUser }) =>
          Boolean((parent as { media?: unknown[] } | undefined)?.media?.length) ||
          (!(parent as { image?: { asset?: unknown } } | undefined)?.image?.asset &&
            !isClientView(currentUser)),
      }),
      // Shape, motion inside the frame and decorative frames: agency only, in the Design tab.
      imageDesignField({
        hidden: ({ parent }: { parent?: { variant?: string } }) => isOverlay(parent ?? {}),
      }),
      defineField({
        name: 'imagePosition',
        title: 'Media side',
        description: 'Which side the media sits on wide screens. On phones it sits below the text.',
        type: 'string',
        initialValue: 'right',
        options: imageSideOptions,
        hidden: notSide,
        validation: (rule) => rule.required(),
      }),
      accessField,
      // Set by the presets above the form; the stored value is the layout the section renders. Hidden
      // so there is one picker, not two. A hidden field keeps its value, and the list subtitle shows it.
      { ...variantField(SPLIT_VARIANTS), hidden: true },
    ],
    { align: 'start' },
    {
      rules: {
        type: 'mediaText',
        // The picture is always there, so Parallax always has something to move.
        hasPicture: () => true,
        // Text over media draws the media as the section's background, so the shared Background image
        // is not offered and a panel sits over the picture (the same rules as the hero's Full background).
        hasOwnBackgroundImage: isOverlay,
        drawsBackground: isOverlay,
      },
    },
  ),
  preview: {
    select: {
      heading: 'heading',
      title: 'title',
      image: 'image',
      slotImage: 'media.0.image',
      variant: 'variant',
      side: 'imagePosition',
      tone: 'style.tone',
    },
    prepare: ({
      heading,
      title,
      image,
      slotImage,
      variant,
      side,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      image?: PreviewValue['media']
      slotImage?: PreviewValue['media']
      variant?: string
      side?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Untitled',
      // "Image + text · Media left": the preset the fields match, or the layout and tone when custom.
      subtitle: splitSubtitle({ variant, imagePosition: side, tone }),
      media: slotImage ?? image,
    }),
  },
})
