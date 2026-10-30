import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { slotField } from '@/features/pages/slots/slot-field'
import { SPLIT_IMAGE_SHAPES, SPLIT_PROPORTIONS } from '@/features/pages/utils/hero-split'
import { DEFAULT_HEADING_TONES, headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageDesignField } from '@/lib/sanity/schema/image-design'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { presetField, presetsOption } from '@/lib/sanity/schema/preset-field'
import { matchPreset } from '@/lib/sanity/schema/preset-match'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  HeroCentredTextThumbnail,
  HeroEditorialThumbnail,
  HeroFullBleedThumbnail,
  HeroOverlayThumbnail,
  HeroProportionEvenThumbnail,
  HeroProportionImageThumbnail,
  HeroProportionTextThumbnail,
  HeroShapeArchThumbnail,
  HeroShapeCircleThumbnail,
  HeroShapeRoundedThumbnail,
  HeroShapeSquareThumbnail,
  HeroSplitLeftThumbnail,
  HeroSplitThumbnail,
} from '@/lib/sanity/schema/thumbnails/hero-thumbnails'

import { heroEyebrowDesignField } from './hero-eyebrow'
import { heroPartMotionField } from './hero-part-motion'
import { imageSideOptions } from './image-side'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-display, balanced over max-w-4xl: about three lines on a phone.
  title: 80,
  // text-lead in max-w-measure-narrow: about four lines.
  description: 200,
  // One line above the title.
  eyebrow: 40,
} as const

/**
 * One component per variant in components/sections/hero/. The first is the default: today's look,
 * and what content without a variant renders. The stored values are the layouts' original names; only
 * the titles editors read changed (README, "Hero presets").
 */
export const HERO_VARIANTS = [
  {
    value: 'overlay',
    title: 'Full background',
    description: 'Centred text over a faded picture.',
    thumbnail: HeroOverlayThumbnail,
  },
  {
    value: 'split',
    title: 'Split',
    description: 'Text on one side, picture on the other.',
    thumbnail: HeroSplitThumbnail,
  },
  {
    value: 'editorial',
    title: 'Editorial',
    description: 'Oversized heading, small picture.',
    thumbnail: HeroEditorialThumbnail,
  },
  {
    value: 'full-bleed',
    title: 'Image with panel',
    description: 'Picture edge to edge, text on a panel at the bottom.',
    thumbnail: HeroFullBleedThumbnail,
  },
] as const

/**
 * The picker at the top of the Content tab: each preset sets a layout and the options that go with it
 * (image side, background) in one click. Six pictures, four layouts: Split has two, and "Centred text"
 * is the Full background layout on a plain background. A preset never clears the image, so nothing is
 * lost by trying one; leave the image empty for text only. The first is a new hero's look.
 */
export const HERO_PRESETS = [
  {
    value: 'full-background',
    title: 'Full background image',
    description: 'Centred text over a picture. Dark.',
    thumbnail: HeroOverlayThumbnail,
    set: { variant: 'overlay', 'style.tone': 'inverse' },
  },
  {
    value: 'split-right',
    title: 'Split, image right',
    description: 'Text on the left, picture on the right.',
    thumbnail: HeroSplitThumbnail,
    set: { variant: 'split', imagePosition: 'right', 'style.tone': 'surface' },
  },
  {
    value: 'split-left',
    title: 'Split, image left',
    description: 'Picture on the left, text on the right.',
    thumbnail: HeroSplitLeftThumbnail,
    set: { variant: 'split', imagePosition: 'left', 'style.tone': 'surface' },
  },
  {
    value: 'centred-text',
    title: 'Centred text, no image',
    description: 'Heading and buttons on a plain background. Leave the image empty.',
    thumbnail: HeroCentredTextThumbnail,
    set: { variant: 'overlay', 'style.tone': 'surface' },
  },
  {
    value: 'editorial',
    title: 'Editorial',
    description: 'Oversized heading with a small picture.',
    thumbnail: HeroEditorialThumbnail,
    set: { variant: 'editorial', 'style.tone': 'surface' },
  },
  {
    value: 'image-with-panel',
    title: 'Image with panel',
    description: 'Picture edge to edge, text on a panel.',
    thumbnail: HeroFullBleedThumbnail,
    set: { variant: 'full-bleed', 'style.tone': 'inverse' },
  },
] as const

/** What an unset field means, so a hero that was never touched still matches its preset (Full background image). */
export const HERO_DEFAULTS = { variant: 'overlay', imagePosition: 'right', 'style.tone': 'inverse' }

/**
 * The list subtitle: "Hero · Split, image left" when the fields match a preset, otherwise the layout
 * and tone ("Hero · Split · Contrast") for a custom combination.
 */
export function heroSubtitle(fields: { variant?: string; imagePosition?: string; tone?: string }) {
  const preset = matchPreset(
    HERO_PRESETS,
    {
      variant: fields.variant,
      imagePosition: fields.imagePosition,
      style: { tone: fields.tone },
    },
    HERO_DEFAULTS,
  )
  return preset
    ? joinSubtitle('Hero', preset.title)
    : variantSubtitle('Hero', HERO_VARIANTS, fields.variant, fields.tone)
}

/** Split only: how the width is shared (the first is the default, an even split). */
const SPLIT_PROPORTION_OPTIONS = [
  {
    value: SPLIT_PROPORTIONS[0],
    title: '50 / 50',
    description: 'Text and picture share the width.',
    thumbnail: HeroProportionEvenThumbnail,
  },
  {
    value: SPLIT_PROPORTIONS[1],
    title: '60 / 40 text',
    description: 'More room for the words.',
    thumbnail: HeroProportionTextThumbnail,
  },
  {
    value: SPLIT_PROPORTIONS[2],
    title: '40 / 60 image',
    description: 'A bigger picture.',
    thumbnail: HeroProportionImageThumbnail,
  },
] as const

const SPLIT_IMAGE_SHAPE_OPTIONS = [
  {
    value: SPLIT_IMAGE_SHAPES[0],
    title: 'Rounded',
    description: 'Soft corners, 4:3.',
    thumbnail: HeroShapeRoundedThumbnail,
  },
  {
    value: SPLIT_IMAGE_SHAPES[1],
    title: 'Square corners',
    description: 'Sharp corners, 4:3.',
    thumbnail: HeroShapeSquareThumbnail,
  },
  {
    value: SPLIT_IMAGE_SHAPES[2],
    title: 'Circle',
    description: 'Always square, cut to a circle.',
    thumbnail: HeroShapeCircleThumbnail,
  },
  {
    value: SPLIT_IMAGE_SHAPES[3],
    title: 'Arch',
    description: 'A tall picture with a rounded top.',
    thumbnail: HeroShapeArchThumbnail,
  },
] as const

/** What each layout uses, so the form shows only what matters (the unset variant is the default, Full background). */
const layoutOf = (section: { variant?: string }) => section.variant ?? HERO_VARIANTS[0].value

/** The Design tab's Split options mean nothing on any other layout, so they are not offered there. */
const notSplit = ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'split'

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: BlockContentIcon,
  // The preset bar above the form: the one place to choose a hero's design (README, "Hero presets").
  options: presetsOption(HERO_PRESETS),
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
      defineField({
        name: 'eyebrowLabels',
        title: 'Eyebrow labels',
        type: 'array',
        description:
          'Optional short labels, one per item, e.g. Yoga, Pilates, Barre. Replaces the small label above when filled in; separators are drawn for you. Leave empty for ordinary text.',
        of: [
          defineArrayMember({
            type: 'string',
            validation: (rule) => [
              rule.required().error('Type a label, or remove this item.'),
              lengthWarning(rule, LIMITS.eyebrow, 'Labels'),
            ],
          }),
        ],
        validation: (rule) => [
          rule.unique().error('Each label is listed once.'),
          rule.max(6).warning('More than 6 labels is hard to take in at a glance.'),
        ],
      }),
      heroEyebrowDesignField,
      // Select words in the title to highlight them. Replaces the plain `title` below, which is read
      // only until the "Hero titles to heading text" migration has run (migrations/README.md).
      headingField({
        name: 'heading',
        title: 'Title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        defaultTone: DEFAULT_HEADING_TONES.hero,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'description',
        type: 'text',
        rows: 3,
        validation: (rule) => lengthWarning(rule, LIMITS.description, 'Intro text'),
      }),
      defineField({
        name: 'ctas',
        title: 'Calls to action',
        type: 'array',
        of: [defineArrayMember({ type: 'cta' })],
        validation: (rule) => rule.max(2),
      }),
      // Behind the text (Full background, Image with panel) or beside it (Split). Cropped to fit, so any landscape
      // picture works; width is what keeps it sharp.
      imageField({
        name: 'backgroundImage',
        title: 'Image',
        description: 'Behind the text in Full background and Image with panel, beside it in Split.',
        // Editorial has its own small picture, below, and never draws this one.
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant === 'editorial',
        requireAlt: false,
        minWidth: 2400,
        orientation: 'landscape',
      }),
      defineField({
        name: 'imagePosition',
        title: 'Image side',
        description: 'Which side the picture sits on at desktop widths.',
        type: 'string',
        initialValue: 'right',
        options: imageSideOptions,
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'split',
      }),
      // Split's picture: its shape, how it moves inside its frame and decorative frames (agency only, Design tab).
      imageDesignField({ hidden: notSplit }),
      // A small picture beside the oversized heading; the Editorial layout is the only one to use it.
      imageField({
        name: 'secondaryImage',
        title: 'Small picture',
        description: 'Shown beside the heading in Editorial. Optional.',
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'editorial',
        aspect: '1:1',
        minWidth: 800,
      }),
      // One approved slot for supporting content under the heading (README, "Adding a slot block"). The
      // agency adds or removes it; clients edit what is in it. Which blocks it takes is the registry's.
      slotField({ name: 'supporting', slot: 'hero.supporting' }),
      defineField({
        name: 'showGreeting',
        title: 'Greet returning visitors',
        description: 'Shows a short "Welcome back" to people who have visited before.',
        type: 'boolean',
        initialValue: false,
      }),
      accessField,
      // Set by the presets above the form; the stored value is the layout the section renders. Hidden
      // so there is one picker, not two. A hidden field keeps its value, and the list subtitle shows it.
      { ...variantField(HERO_VARIANTS), hidden: true },
    ],
    // Alignment is left to the layout: Full background centres, the others start.
    { tone: 'inverse', spacing: 'spacious', motion: 'none' },
    {
      // Split's own options, in the collapsed Advanced area of the Design tab: it disappears for the
      // other layouts.
      advanced: [
        presetField({
          name: 'proportion',
          title: 'Proportion',
          description: 'How the width is shared between the text and the picture on wide screens.',
          options: SPLIT_PROPORTION_OPTIONS,
          required: false,
          hidden: notSplit,
        }),
        // Superseded by the Image design's Appearance, which shows this value until it is changed. Hidden
        // rather than removed so content that chose a shape keeps it.
        presetField({
          name: 'imageShape',
          title: 'Image shape',
          options: SPLIT_IMAGE_SHAPE_OPTIONS,
          required: false,
          hidden: true,
        }),
        // Agency-only and off by default: one animation and delay per part (README, "Animating individual parts").
        heroPartMotionField,
      ],
      rules: {
        type: 'hero',
        // The pictures that sit behind the text are the ones Parallax moves.
        hasPicture: (section) => ['overlay', 'full-bleed'].includes(layoutOf(section)),
        // Split and Editorial lay their text out themselves.
        fixesAlignment: (section) => ['split', 'editorial'].includes(layoutOf(section)),
        // The hero has its own Image, so the shared Background image is not offered.
        hasOwnBackgroundImage: () => true,
      },
    },
  ),
  preview: {
    select: {
      heading: 'heading',
      title: 'title',
      media: 'backgroundImage',
      variant: 'variant',
      imagePosition: 'imagePosition',
      tone: 'style.tone',
    },
    prepare: ({
      heading,
      title,
      media,
      variant,
      imagePosition,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      media?: PreviewValue['media']
      variant?: string
      imagePosition?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Untitled',
      subtitle: heroSubtitle({ variant, imagePosition, tone }),
      media,
    }),
  },
})
