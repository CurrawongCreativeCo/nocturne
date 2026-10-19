import { defineField, type ConditionalPropertyCallback } from 'sanity'

import {
  GLOW_COLOUR_CHOICES,
  GLOW_LEVELS,
  GLOW_TARGETS,
  GLOW_TARGET_TITLES,
  GLOW_TITLES,
  SHADOW_DESCRIPTIONS,
  SHADOW_LEVELS,
  SHADOW_TITLES,
} from '@/lib/sanity/depth-options'
import {
  INLINE_CASES,
  INLINE_CASE_TITLES,
  INLINE_COLOUR_CHOICES,
  INLINE_GAPS,
  INLINE_GAP_TITLES,
  INLINE_PHONE_LAYOUTS,
  INLINE_PHONE_LAYOUT_TITLES,
  INLINE_SEPARATORS,
  INLINE_SEPARATOR_TITLES,
  INLINE_SIZES,
  INLINE_SIZE_TITLES,
  INLINE_WEIGHTS,
  INLINE_WEIGHT_TITLES,
} from '@/lib/sanity/inline-list-options'
import {
  LINK_ARROWS,
  LINK_ARROW_DESCRIPTIONS,
  LINK_ARROW_TITLES,
} from '@/lib/sanity/link-arrow-options'
import {
  BORDER_GAPS,
  BORDER_GAP_TITLES,
  BORDER_WIDTHS,
  BORDER_WIDTH_TITLES,
  PROFILE_BORDERS,
  PROFILE_BORDER_TITLES,
  PROFILE_IMAGE_SHAPES,
  PROFILE_IMAGE_SHAPE_TITLES,
  PROFILE_IMAGE_SIZES,
  PROFILE_IMAGE_SIZE_TITLES,
} from '@/lib/sanity/profile-image-options'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import { themeColourField } from '@/lib/sanity/schema/theme-colour'
import {
  linkArrowThumbnails,
  shadowThumbnails,
  socialStyleThumbnails,
} from '@/lib/sanity/schema/thumbnails/link-design-thumbnails'
import {
  SOCIAL_POSITIONS,
  SOCIAL_POSITION_TITLES,
  SOCIAL_STYLES,
  SOCIAL_STYLE_TITLES,
} from '@/lib/sanity/social-style-options'

import { defaultLinkArrow, usesArrow } from '../../utils/link-list'

/**
 * The Link list's own Design options (agency only, like the rest of Design), in four boxes above the
 * shared Background and Animation: Profile, Service categories, Links, Social icons and a collapsed
 * Depth and glow. Each starts with one or two
 * picture or radio choices; the colour overrides sit in a collapsed "Colours" inside each box, and
 * every option that depends on another is shown only once it applies. Everything empty is the look
 * the section always had (link-list-parts.tsx resolves the defaults).
 */

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ value, title: titles[value] })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

const colours = {
  name: 'colours',
  title: 'Colours',
  description: 'Inherit keeps the theme’s colours. Change one only for a deliberate accent.',
  options: { collapsible: true, collapsed: true },
}

interface ProfileDesign {
  border?: string
}
const borderIs =
  (...kinds: string[]): ConditionalPropertyCallback =>
  ({ parent }) =>
    !kinds.includes((parent as ProfileDesign | undefined)?.border ?? 'none')

interface Section {
  profile?: { image?: { asset?: unknown } }
  variant?: string
  rowStyle?: string
  showArrows?: boolean
  socialSource?: string
  linkDesign?: { arrowStyle?: string }
  socialDesign?: { style?: string }
}
/** The Link list a field of one of these boxes sits in (the path is section › box › field). */
const sectionOf = (context: { document?: unknown; path?: unknown }) =>
  sectionAtStylePath(context.document, context.path as never) as Section | undefined

/** The layout a section draws; unset is Minimal. */
const layoutOf = (variant: string | undefined) => variant ?? 'stacked'

/** The glow's options only show once a glow is chosen. */
const glowOff: ConditionalPropertyCallback = ({ parent }) =>
  ((parent as { glow?: string } | undefined)?.glow ?? 'off') === 'off'

const agencyOnly =
  (own?: ConditionalPropertyCallback): ConditionalPropertyCallback =>
  (context) =>
    hiddenFromClients(context) || (own ? own(context) : false)

export const linkListDesignFields = [
  defineField({
    name: 'profileDesign',
    title: 'Profile',
    type: 'object',
    group: 'design',
    description: 'The picture or logo at the top, and the colours of the name and bio.',
    hidden: agencyOnly(),
    options: { collapsible: true, collapsed: false },
    fieldsets: [colours],
    fields: [
      defineField({
        name: 'imageSize',
        title: 'Picture size',
        type: 'string',
        description: 'Medium is each layout’s own size.',
        options: radio(PROFILE_IMAGE_SIZES, PROFILE_IMAGE_SIZE_TITLES),
      }),
      defineField({
        name: 'imageShape',
        title: 'Picture shape',
        type: 'string',
        description:
          'Circle suits a face. Logo, uncropped shows a logo whole, in its own proportions; use one with a transparent background.',
        options: radio(PROFILE_IMAGE_SHAPES, PROFILE_IMAGE_SHAPE_TITLES),
      }),
      defineField({
        name: 'border',
        title: 'Border',
        type: 'string',
        description:
          'A ring around the picture, with a small see-through gap, or an approved decorative frame.',
        options: radio(PROFILE_BORDERS, PROFILE_BORDER_TITLES),
      }),
      defineField({
        name: 'borderWidth',
        title: 'Ring thickness',
        type: 'string',
        options: radio(BORDER_WIDTHS, BORDER_WIDTH_TITLES),
        hidden: borderIs('line', 'gradient'),
      }),
      defineField({
        name: 'borderGap',
        title: 'Gap to the picture',
        type: 'string',
        options: radio(BORDER_GAPS, BORDER_GAP_TITLES),
        hidden: borderIs('line', 'gradient'),
      }),
      defineField({
        name: 'borderGradient',
        title: 'Gradient',
        type: 'string',
        description:
          'A gradient from Design → Brand colours. Leave empty for Primary to Secondary.',
        options: { gradientPicker: true },
        hidden: borderIs('gradient'),
      }),
      defineField({
        name: 'frame',
        title: 'Frame',
        type: 'reference',
        to: [{ type: 'frame' }],
        description:
          'An approved SVG frame, added by the agency under Design › Image frames. The picture shrinks a little inside it, so the layout stays the same.',
        hidden: borderIs('frame'),
        validation: (rule) =>
          rule
            .custom((value, { parent }) =>
              (parent as ProfileDesign | undefined)?.border === 'frame' && !value
                ? 'Choose a frame. Until then the picture has no border.'
                : true,
            )
            .warning(),
      }),
      themeColourField({
        name: 'borderColour',
        title: 'Border colour',
        usage: 'graphic',
        inherits: 'Primary',
        choices: ['ink', 'accent', 'accent-2', 'highlight'],
        hidden: borderIs('line', 'frame'),
      }),
      themeColourField({
        name: 'nameColour',
        title: 'Name colour',
        usage: 'text',
        inherits: 'the text colour',
        fieldset: 'colours',
      }),
      themeColourField({
        name: 'bioColour',
        title: 'Bio colour',
        usage: 'text',
        inherits: 'the muted text colour',
        fieldset: 'colours',
      }),
    ],
  }),
  defineField({
    name: 'categoryDesign',
    title: 'Service categories',
    type: 'object',
    group: 'design',
    description:
      'The row of categories under the name. It follows the section’s alignment. Empty is small words with a bullet in Primary between them.',
    hidden: agencyOnly(
      ({ parent }) =>
        !(parent as { profile?: { categories?: unknown[] } } | undefined)?.profile?.categories
          ?.length,
    ),
    options: { collapsible: true, collapsed: false },
    fieldsets: [
      {
        name: 'text',
        title: 'Text',
        description: 'Size, weight, capitals and spacing.',
        options: { collapsible: true, collapsed: true },
      },
      colours,
    ],
    fields: [
      defineField({
        name: 'separator',
        title: 'Separator',
        type: 'string',
        description: 'Drawn between two categories, never at the start or end of a line.',
        options: radio(INLINE_SEPARATORS, INLINE_SEPARATOR_TITLES),
      }),
      defineField({
        name: 'phoneLayout',
        title: 'On a phone',
        type: 'string',
        description: 'One per line suits long names or more than four categories.',
        options: radio(INLINE_PHONE_LAYOUTS, INLINE_PHONE_LAYOUT_TITLES),
      }),
      defineField({
        name: 'size',
        title: 'Size',
        type: 'string',
        fieldset: 'text',
        options: radio(INLINE_SIZES, INLINE_SIZE_TITLES),
      }),
      defineField({
        name: 'weight',
        title: 'Weight',
        type: 'string',
        fieldset: 'text',
        options: radio(INLINE_WEIGHTS, INLINE_WEIGHT_TITLES),
      }),
      defineField({
        name: 'textCase',
        title: 'Letters',
        type: 'string',
        description: 'Capitals are spaced out a little, as small capitals usually are.',
        fieldset: 'text',
        options: radio(INLINE_CASES, INLINE_CASE_TITLES),
      }),
      defineField({
        name: 'gap',
        title: 'Space between',
        type: 'string',
        fieldset: 'text',
        options: radio(INLINE_GAPS, INLINE_GAP_TITLES),
      }),
      themeColourField({
        name: 'textColour',
        title: 'Category colour',
        usage: 'text',
        inherits: 'the text colour',
        choices: INLINE_COLOUR_CHOICES,
        fieldset: 'colours',
      }),
      themeColourField({
        name: 'separatorColour',
        title: 'Separator colour',
        usage: 'graphic',
        description: 'Inherit uses Primary. Highlight or a Custom gold suits a warm brand.',
        inherits: 'Primary',
        choices: INLINE_COLOUR_CHOICES,
        fieldset: 'colours',
        hidden: ({ parent }) =>
          (parent as { separator?: string } | undefined)?.separator === 'none',
      }),
    ],
  }),
  defineField({
    name: 'linkDesign',
    title: 'Links',
    type: 'object',
    group: 'design',
    description: 'The indicator at the end of each link, and the colour of the link icons.',
    hidden: agencyOnly(({ parent }) => !usesArrow((parent as Section | undefined)?.variant)),
    options: { collapsible: true, collapsed: false },
    fieldsets: [colours],
    fields: [
      presetField({
        name: 'arrowStyle',
        title: 'Arrow style',
        description: 'One choice for every link in the list.',
        required: false,
        initialValue: null,
        options: LINK_ARROWS.map((value) => ({
          value,
          title: LINK_ARROW_TITLES[value],
          description: LINK_ARROW_DESCRIPTIONS[value],
          thumbnail: linkArrowThumbnails[value],
        })),
        // What the layout draws while nothing is chosen, so the picker shows it as chosen.
        defaultValue: (context) => {
          const section = sectionOf(context)
          return defaultLinkArrow({
            layout: section?.variant,
            rowStyle: section?.rowStyle,
            showArrows: section?.showArrows,
          })
        },
      }),
      themeColourField({
        name: 'arrowColour',
        title: 'Arrow colour',
        usage: 'graphic',
        onRows: true,
        inherits: 'the link’s own colour',
        choices: ['ink', 'muted', 'accent', 'accent-2', 'highlight'],
        fieldset: 'colours',
        hidden: ({ parent }) =>
          (parent as { arrowStyle?: string } | undefined)?.arrowStyle === 'none',
      }),
      themeColourField({
        name: 'iconColour',
        title: 'Icon colour',
        usage: 'graphic',
        onRows: true,
        inherits: 'the link’s own colour',
        choices: ['ink', 'muted', 'accent', 'accent-2', 'highlight'],
        fieldset: 'colours',
      }),
    ],
  }),
  defineField({
    name: 'socialDesign',
    title: 'Social icons',
    type: 'object',
    group: 'design',
    description: 'How the social icons look and where they sit.',
    hidden: agencyOnly(({ parent }) => (parent as Section | undefined)?.socialSource === 'none'),
    options: { collapsible: true, collapsed: false },
    fieldsets: [colours],
    fields: [
      presetField({
        name: 'style',
        title: 'Icon style',
        description:
          'The shaped styles put each icon on a button; with Glass rows the buttons are frosted glass to match.',
        required: false,
        initialValue: null,
        options: SOCIAL_STYLES.map((value) => ({
          value,
          title: SOCIAL_STYLE_TITLES[value],
          thumbnail: socialStyleThumbnails[value],
        })),
        defaultValue: () => 'plain',
      }),
      defineField({
        name: 'position',
        title: 'Position',
        type: 'string',
        options: radio(SOCIAL_POSITIONS, SOCIAL_POSITION_TITLES),
      }),
      themeColourField({
        name: 'iconColour',
        title: 'Icon colour',
        usage: 'graphic',
        inherits: 'the muted text colour (the text colour on buttons)',
        fieldset: 'colours',
      }),
      themeColourField({
        name: 'background',
        title: 'Button colour',
        usage: 'graphic',
        inherits: 'the section’s surface',
        choices: ['ink', 'accent', 'accent-2', 'highlight'],
        fieldset: 'colours',
        // Plain icons have no button, and glass buttons must stay see-through.
        hidden: (context) => {
          const style = (context.parent as { style?: string } | undefined)?.style ?? 'plain'
          const section = sectionOf(context)
          const glassRows =
            (section?.variant ?? 'stacked') === 'stacked' && section?.rowStyle === 'glass'
          return style === 'plain' || glassRows
        },
      }),
    ],
  }),
  defineField({
    name: 'depthDesign',
    title: 'Depth and glow',
    type: 'object',
    group: 'design',
    description:
      'How far the links, social buttons and picture lift off the page, and an optional soft glow in a theme colour. Leave a shadow empty for the layout’s own.',
    hidden: agencyOnly(),
    options: { collapsible: true, collapsed: true },
    fields: [
      presetField({
        name: 'linkShadow',
        title: 'Link shadow',
        description: 'One choice for every link. Empty is the layout’s own.',
        required: false,
        initialValue: null,
        options: SHADOW_LEVELS.map((value) => ({
          value,
          title: SHADOW_TITLES[value],
          description: SHADOW_DESCRIPTIONS[value],
          thumbnail: shadowThumbnails[value],
        })),
        // Editorial links are a ruled list with no surface to lift.
        hidden: (context) => layoutOf(sectionOf(context)?.variant) === 'editorial',
      }),
      defineField({
        name: 'socialShadow',
        title: 'Social button shadow',
        type: 'string',
        description: 'Only for the shaped icon styles. Empty is the style’s own.',
        options: radio(SHADOW_LEVELS, SHADOW_TITLES),
        hidden: (context) => {
          const section = sectionOf(context)
          return (
            section?.socialSource === 'none' ||
            (section?.socialDesign?.style ?? 'plain') === 'plain'
          )
        },
      }),
      defineField({
        name: 'pictureShadow',
        title: 'Picture shadow',
        type: 'string',
        description:
          'Follows the picture’s own outline, so a round photo or a transparent logo gets no square shadow. Empty is none.',
        options: radio(SHADOW_LEVELS, SHADOW_TITLES),
        hidden: (context) => !sectionOf(context)?.profile?.image?.asset,
      }),
      defineField({
        name: 'glow',
        title: 'Glow',
        type: 'string',
        description: 'A soft halo around what you tick below. Strongest on a dark background.',
        options: radio(GLOW_LEVELS, GLOW_TITLES),
      }),
      defineField({
        name: 'glowTargets',
        title: 'Glow around',
        type: 'array',
        of: [{ type: 'string' }],
        description: 'The links while nothing is ticked.',
        options: {
          list: GLOW_TARGETS.map((value) => ({ value, title: GLOW_TARGET_TITLES[value] })),
          layout: 'grid',
        },
        hidden: glowOff,
      }),
      themeColourField({
        name: 'glowColour',
        title: 'Glow colour',
        usage: 'graphic',
        inherits: 'Primary',
        choices: GLOW_COLOUR_CHOICES,
        hidden: glowOff,
      }),
    ],
  }),
]
