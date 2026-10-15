import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  HeroEditorialThumbnail,
  HeroFullBleedThumbnail,
  HeroOverlayThumbnail,
  HeroSplitThumbnail,
} from '@/lib/sanity/schema/thumbnails/hero-thumbnails'

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
 * and what content without a variant renders.
 */
export const HERO_VARIANTS = [
  {
    value: 'overlay',
    title: 'Overlay',
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
    title: 'Full bleed',
    description: 'Picture edge to edge, text at the bottom.',
    thumbnail: HeroFullBleedThumbnail,
  },
] as const

/** What each layout uses, so the form shows only what matters (the unset variant is the default, Overlay). */
const layoutOf = (section: { variant?: string }) => section.variant ?? HERO_VARIANTS[0].value

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: BlockContentIcon,
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
        name: 'title',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
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
      // Behind the text (Overlay, Full bleed) or beside it (Split). Cropped to fit, so any landscape
      // picture works; width is what keeps it sharp.
      imageField({
        name: 'backgroundImage',
        title: 'Image',
        description: 'Behind the text in Overlay and Full bleed, beside it in Split.',
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
        options: { list: ['left', 'right'], layout: 'radio', direction: 'horizontal' },
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'split',
      }),
      // A small picture beside the oversized heading; the Editorial layout is the only one to use it.
      imageField({
        name: 'secondaryImage',
        title: 'Small picture',
        description: 'Shown beside the heading in Editorial. Optional.',
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'editorial',
        aspect: '1:1',
        minWidth: 800,
      }),
      defineField({
        name: 'showGreeting',
        title: 'Greet returning visitors',
        description: 'Shows a short "Welcome back" to people who have visited before.',
        type: 'boolean',
        initialValue: false,
      }),
      accessField,
      variantField(HERO_VARIANTS),
    ],
    // Alignment is left to the layout: Overlay centres, the others start.
    { tone: 'inverse', spacing: 'spacious', motion: 'none' },
    {
      rules: {
        type: 'hero',
        // The pictures that sit behind the text are the ones Parallax moves.
        hasPicture: (section) => ['overlay', 'full-bleed'].includes(layoutOf(section)),
        // Split and Editorial lay their text out themselves.
        fixesAlignment: (section) => ['split', 'editorial'].includes(layoutOf(section)),
      },
    },
  ),
  preview: {
    select: { title: 'title', media: 'backgroundImage', variant: 'variant', tone: 'style.tone' },
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
      subtitle: variantSubtitle('Hero', HERO_VARIANTS, variant, tone),
      media,
    }),
  },
})
