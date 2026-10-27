import { defineField, type ConditionalPropertyCallback, type FieldDefinition } from 'sanity'

import { BODY_TEXT_RATIO } from '@/lib/color/background-contrast'
import {
  cardLabelHex,
  cardTextContrast,
  layeredCardSurface,
  type StoredCardSurface,
} from '@/lib/color/card-contrast'
import { glassRowsStrength } from '@/lib/color/glass-contrast'
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
import { LETTER_SPACINGS, LETTER_SPACING_TITLES } from '@/lib/sanity/letter-spacing'
import {
  LINK_ARROWS,
  LINK_ARROW_DESCRIPTIONS,
  LINK_ARROW_TITLES,
} from '@/lib/sanity/link-arrow-options'
import { scopedTitle } from '@/lib/sanity/link-design-summary'
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
import { fetchBrandColours } from '@/lib/sanity/schema/brand-colours'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import {
  choiceField,
  iconDesignFields,
  surfaceFields,
  textStyleField,
} from '@/lib/sanity/schema/surface-design'
import { themeColourField } from '@/lib/sanity/schema/theme-colour'
import {
  linkArrowThumbnails,
  shadowThumbnails,
  socialStyleThumbnails,
} from '@/lib/sanity/schema/thumbnails/link-design-thumbnails'
import { validateVisible } from '@/lib/sanity/schema/validate-visible'
import {
  SOCIAL_POSITIONS,
  SOCIAL_POSITION_TITLES,
  SOCIAL_STYLES,
  SOCIAL_STYLE_TITLES,
} from '@/lib/sanity/social-style-options'
import {
  BORDER_COLOUR_CHOICES,
  SURFACE_BORDERS,
  SURFACE_BORDER_TITLES,
  SURFACE_COLOUR_CHOICES,
  SURFACE_STRENGTHS,
  SURFACE_STRENGTH_TITLES,
} from '@/lib/sanity/surface-options'

import { defaultLinkArrow, ownIconShape, usesArrow } from '../../utils/link-list'
import { enclosingOfArray, memberOfArray } from '../../utils/schema-path'

/**
 * The Link list's own Design options (agency only, like the rest of Design), in four boxes above the
 * shared Background and Animation: Profile, Service categories, Links, Social icons, Dividers and a
 * collapsed Depth and glow. Each starts with one or two
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
  profile?: { image?: { asset?: unknown }; categories?: unknown[]; bio?: string }
  variant?: string
  rowStyle?: string
  glassStrength?: string
  showArrows?: boolean
  socialSource?: string
  style?: { tone?: string }
  cardDesign?: StoredCardSurface
  linkDesign?: { arrowStyle?: string; iconShape?: string }
  socialDesign?: { style?: string; border?: string }
}
/** The Link list a field of one of these boxes sits in (the path is section › box › field). */
const sectionOf = (context: { document?: unknown; path?: unknown }) =>
  sectionAtStylePath(context.document, context.path as never) as Section | undefined

/** The layout a section draws; unset is Minimal. */
const layoutOf = (variant: string | undefined) => variant ?? 'stacked'

/** The glow's options only show once a glow is chosen. */
const glowOff: ConditionalPropertyCallback = ({ parent }) =>
  ((parent as { glow?: string } | undefined)?.glow ?? 'off') === 'off'

/** The social dividers only apply while the section shows social icons. */
const noSocials: ConditionalPropertyCallback = (context) =>
  sectionOf(context)?.socialSource === 'none'

/**
 * Adds a warning to a card's Background colour: the label measured on the background the card draws
 * (the card's choice over the list's, lib/color/card-contrast.ts), with the site's Brand colours.
 * Other fields pass through unchanged, so it can map over `surfaceFields`.
 */
export function withCardContrast<T extends FieldDefinition>(field: T, { inItem = false } = {}): T {
  if (field.name !== 'background') return field
  return {
    ...field,
    validation: (rule: { custom: (fn: unknown) => { warning: () => unknown } }) =>
      rule
        .custom(
          async (
            _value: unknown,
            context: {
              document?: unknown
              path?: unknown
              getClient: (options: { apiVersion: string }) => never
            },
          ) => {
            const path = context.path as never
            const section = (
              inItem ? enclosingOfArray(context.document, path, 'links') : sectionOf(context)
            ) as Section | undefined
            const link = inItem
              ? (memberOfArray(context.document, path, 'links') as
                  { design?: StoredCardSurface & { appearance?: string } } | undefined)
              : undefined
            const card = link?.design?.appearance === 'custom' ? link.design : undefined
            const surface = layeredCardSurface(section?.cardDesign, card)
            const tone = section?.style?.tone
            const { colours } = await fetchBrandColours(
              context.getClient({ apiVersion: '2025-01-01' }),
            )
            const result = cardTextContrast({
              foreground: cardLabelHex(surface, tone, colours),
              surface,
              tone,
              glass: glassRowsStrength(section),
              site: colours,
            })
            if (!result || result.ratio >= BODY_TEXT_RATIO) return true
            return `The label may be hard to read on this background: ${result.ratio.toFixed(1)}:1 (text needs ${BODY_TEXT_RATIO}:1)${glassRowsStrength(section) ? ', measured over the lightest or darkest part of a photo' : ''}. Choose a stronger or different colour, or change the label colour under Text.`
          },
        )
        .warning(),
  }
}

/** Editorial links are a ruled list, with no card to colour. */
const isEditorial: ConditionalPropertyCallback = (context) =>
  layoutOf(sectionOf(context)?.variant) === 'editorial'
const isCompact: ConditionalPropertyCallback = (context) =>
  layoutOf(sectionOf(context)?.variant) === 'compact'

/** Plain social icons have no button to fill or outline. */
const plainSocial: ConditionalPropertyCallback = ({ parent }) =>
  ((parent as { style?: string } | undefined)?.style ?? 'plain') === 'plain'

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
    description: 'Picture, name and bio colours.',
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
        description: 'Circle suits a face; Logo, uncropped keeps the whole logo.',
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
        options: { disableNew: true },
        description: 'An approved frame from Design → Image frames. The picture fits inside it.',
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
      'Categories below the name. Unset: small words, Primary bullets and the section’s alignment.',
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
        fieldset: 'text',
        options: radio(INLINE_CASES, INLINE_CASE_TITLES),
      }),
      defineField({
        name: 'letterSpacing',
        title: 'Letter spacing',
        type: 'string',
        options: radio(LETTER_SPACINGS, LETTER_SPACING_TITLES),
        fieldset: 'text',
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
        decorative: true,
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
    name: 'cardDesign',
    title: scopedTitle('Cards', 'list'),
    type: 'object',
    group: 'design',
    description:
      'Shared background, border and text. Inherit uses the layout. Override one link in Content → Appearance.',
    hidden: agencyOnly(),
    options: { collapsible: true, collapsed: false },
    fieldsets: [
      {
        name: 'text',
        title: 'Text',
        description: 'Eyebrow, label and description.',
        options: { collapsible: true, collapsed: true },
      },
    ],
    fields: [
      ...surfaceFields({ inherits: 'the layout’s own', hidden: isEditorial }).map((field) =>
        withCardContrast(field),
      ),
      textStyleField({
        element: 'eyebrow',
        inherits: 'the layout’s own',
        fieldset: 'text',
        hidden: isCompact,
      }),
      textStyleField({ element: 'label', inherits: 'the layout’s own', fieldset: 'text' }),
      textStyleField({
        element: 'description',
        inherits: 'the layout’s own',
        fieldset: 'text',
        hidden: isCompact,
      }),
    ],
  }),
  defineField({
    name: 'linkDesign',
    title: scopedTitle('Arrows and icons', 'list'),
    type: 'object',
    group: 'design',
    description: 'Link arrows and icons, with optional filled or outlined icon containers.',
    hidden: agencyOnly(),
    options: { collapsible: true, collapsed: false },
    fieldsets: [
      colours,
      {
        name: 'icons',
        title: 'Icons',
        description: 'For links with an icon. A link can change these for itself.',
        options: { collapsible: true, collapsed: true },
      },
    ],
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
        hidden: (context) => !usesArrow(sectionOf(context)?.variant),
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
        hidden: (context) =>
          !usesArrow(sectionOf(context)?.variant) ||
          (context.parent as { arrowStyle?: string } | undefined)?.arrowStyle === 'none',
      }),
      // `iconColour` keeps its name (and saved choices) from before the containers.
      ...iconDesignFields({
        inherits: 'the layout’s own',
        fieldset: 'icons',
        hidden: isEditorial,
        shapeOf: (context) => {
          const section = sectionOf(context)
          return (
            (context.parent as { iconShape?: string } | undefined)?.iconShape ??
            ownIconShape(section?.variant, section?.rowStyle)
          )
        },
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
          'The shaped styles put each icon on a button; with Glass rows the buttons are frosted glass to match. Its colour, strength and border are below.',
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
        description:
          'Inherit uses the section’s surface. With Glass rows the buttons are glass: a colour tints them and the blur stays.',
        usage: 'graphic',
        inherits: 'the section’s surface',
        choices: SURFACE_COLOUR_CHOICES,
        fieldset: 'colours',
        // Plain icons have no button.
        hidden: plainSocial,
      }),
      choiceField({
        name: 'backgroundStrength',
        title: 'Button strength',
        description: 'How much of the button colour shows. Solid hides what is behind.',
        values: SURFACE_STRENGTHS,
        titles: SURFACE_STRENGTH_TITLES,
        inherits: 'the style’s own (the glass strength with Glass rows, else Solid)',
        fieldset: 'colours',
        hidden: (context) =>
          plainSocial(context) ||
          (context.parent as { background?: { colour?: string } } | undefined)?.background
            ?.colour === 'transparent',
      }),
      choiceField({
        name: 'border',
        title: 'Button border',
        description: 'None removes it.',
        values: SURFACE_BORDERS,
        titles: SURFACE_BORDER_TITLES,
        inherits: 'the style’s own (thin)',
        hidden: plainSocial,
      }),
      themeColourField({
        name: 'borderColour',
        title: 'Button border colour',
        usage: 'graphic',
        inherits: 'the style’s own',
        choices: BORDER_COLOUR_CHOICES,
        fieldset: 'colours',
        hidden: (context) =>
          plainSocial(context) ||
          (context.parent as { border?: string } | undefined)?.border === 'none',
      }),
    ],
  }),
  defineField({
    name: 'dividerDesign',
    title: 'Dividers',
    type: 'object',
    group: 'design',
    description:
      'Rules between visible parts: lines, fading lines or dots, with an optional centre.',
    hidden: agencyOnly(),
    options: { collapsible: true, collapsed: false },
    fields: [
      defineField({
        name: 'afterCategories',
        title: 'Between the categories and the bio',
        type: 'decorativeDivider',
        hidden: (context) => {
          const profile = sectionOf(context)?.profile
          return !profile?.categories?.length || !profile.bio
        },
      }),
      defineField({
        name: 'afterProfile',
        title: 'After the profile',
        type: 'decorativeDivider',
      }),
      defineField({
        name: 'aboveSocial',
        title: 'Above the social icons',
        description: 'Words here make a heading for the icons, e.g. “Stay connected”.',
        type: 'decorativeDivider',
        hidden: noSocials,
      }),
      defineField({
        name: 'belowSocial',
        title: 'Below the social icons',
        description: 'Not drawn when the icons are the last thing in the list.',
        type: 'decorativeDivider',
        hidden: noSocials,
      }),
    ],
  }),
  defineField({
    name: 'depthDesign',
    title: 'Depth and glow',
    type: 'object',
    group: 'design',
    description: 'Shadows and a theme-coloured glow. Unset shadows follow the layout.',
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
        decorative: true,
        inherits: 'Primary',
        choices: GLOW_COLOUR_CHOICES,
        hidden: glowOff,
      }),
    ],
  }),
].map(validateVisible)
