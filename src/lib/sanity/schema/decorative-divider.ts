import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import { LETTER_SPACINGS, LETTER_SPACING_TITLES } from '@/lib/sanity/letter-spacing'

import {
  DIVIDER_CENTRES,
  DIVIDER_CENTRE_SIZES,
  DIVIDER_CENTRE_SIZE_TITLES,
  DIVIDER_CENTRE_TITLES,
  DIVIDER_COLOUR_CHOICES,
  DIVIDER_FINISHES,
  DIVIDER_FINISH_DESCRIPTIONS,
  DIVIDER_FINISH_TITLES,
  GLOW_STYLES,
  DIVIDER_STYLES,
  DIVIDER_STYLE_DESCRIPTIONS,
  DIVIDER_STYLE_TITLES,
  DIVIDER_TEXT_CASES,
  DIVIDER_TEXT_CASE_TITLES,
  DIVIDER_TEXT_MAX,
  DIVIDER_THICKNESSES,
  DIVIDER_THICKNESS_TITLES,
  DIVIDER_WIDTHS,
  DIVIDER_WIDTH_TITLES,
} from '../divider-options'
import { badgeIconField } from './badge-icon-field'
import { builtOptions } from './capability-marker'
import { imageField } from './image-field'
import { lengthWarning } from './length-guidance'
import { presetField } from './preset-field'
import { themeColourField } from './theme-colour'
import { dividerFinishThumbnails, dividerThumbnails } from './thumbnails/divider-thumbnails'
import { validateVisible } from './validate-visible'

/**
 * The shared `decorativeDivider` object: one decorative rule, with an optional centre between two
 * lines (README, "Decorative dividers"). The style is a picture; everything else appears only once
 * it applies: the centre once there is a line, its icon, words or picture once chosen, the colours
 * in a collapsed box. Empty (or None) draws nothing, so adding a field of this type changes no page.
 * DecorativeDivider (components/ui/decorative-divider.tsx) draws it, from `resolveDivider`.
 */

interface Divider {
  style?: string
  centre?: string
}
const divider = (parent: unknown) => (parent ?? {}) as Divider
const isOff = (parent: unknown) => (divider(parent).style ?? 'none') === 'none'
/** Three dots stand alone: they take no centre and have no length. */
const isOffOrDots = (parent: unknown) => isOff(parent) || divider(parent).style === 'dots'
const offOrDots: ConditionalPropertyCallback = ({ parent }) => isOffOrDots(parent)
/**
 * A Gradient is always Primary to Secondary, so it has no line colour to choose. A colour stored before the style was
 * changed is kept (the field is only hidden) and is simply not drawn.
 */
const offOrGradient: ConditionalPropertyCallback = ({ parent }) =>
  isOff(parent) || divider(parent).style === 'gradient'
/** A finish is offered only for the styles that can glow; one stored before the style changed is kept, not drawn. */
const notGlowable: ConditionalPropertyCallback = ({ parent }) =>
  !GLOW_STYLES.includes((divider(parent).style ?? 'none') as never)
const centreIs =
  (...kinds: string[]): ConditionalPropertyCallback =>
  ({ parent }) =>
    isOffOrDots(parent) || !kinds.includes(divider(parent).centre ?? 'none')

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ value, title: titles[value] })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

/**
 * The options of a named array type that offers this divider as a block in its body (task 151: the Rich
 * text section's `richTextBody`), stamped as the shared divider builder's so the design contract can tell a
 * field of that type is the divider capability. It lives here because only this module may stamp as the
 * divider builder. Nothing is stored and the Studio draws the field as before.
 */
export const dividerBlockOptions = () => builtOptions('decorativeDivider', {}, 'divider')

export const decorativeDivider = defineType({
  name: 'decorativeDivider',
  title: 'Divider',
  type: 'object',
  // A shared design capability (lib/design/capabilities.ts): every field of this type is one.
  options: builtOptions('decorativeDivider', { collapsible: true, collapsed: true }, 'divider'),
  fieldsets: [
    {
      name: 'colours',
      title: 'Colours',
      description:
        'Inherit uses the line colour for the lines, and the lines’ colour for the middle.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    presetField({
      name: 'style',
      title: 'Divider',
      options: DIVIDER_STYLES.map((value) => ({
        value,
        title: DIVIDER_STYLE_TITLES[value],
        description: DIVIDER_STYLE_DESCRIPTIONS[value],
        thumbnail: dividerThumbnails[value],
      })),
      // Empty is None, so a new field of this type changes nothing.
      required: false,
      initialValue: null,
      defaultValue: () => 'none',
    }),
    defineField({
      name: 'centre',
      title: 'In the middle',
      type: 'string',
      options: radio(DIVIDER_CENTRES, DIVIDER_CENTRE_TITLES),
      hidden: offOrDots,
    }),
    defineField({
      name: 'text',
      title: 'Words',
      type: 'string',
      description: 'A short label, e.g. “Stay connected”. Read out like any other text.',
      hidden: centreIs('text'),
      validation: (rule) => lengthWarning(rule, DIVIDER_TEXT_MAX, 'Divider words'),
    }),
    defineField({
      name: 'textCase',
      title: 'Letters',
      type: 'string',
      options: radio(DIVIDER_TEXT_CASES, DIVIDER_TEXT_CASE_TITLES),
      hidden: centreIs('text'),
    }),
    defineField({
      name: 'letterSpacing',
      title: 'Letter spacing',
      type: 'string',
      options: radio(LETTER_SPACINGS, LETTER_SPACING_TITLES),
      hidden: centreIs('text'),
    }),
    badgeIconField({ hidden: centreIs('icon') }),
    {
      ...imageField({
        name: 'image',
        title: 'Picture',
        description:
          'A small mark or motif, with a transparent background. Decoration only: it has no alt text.',
        requireAlt: false,
        preferSvg: true,
        hidden: centreIs('image'),
      }),
    },
    defineField({
      name: 'centreSize',
      title: 'Size in the middle',
      type: 'string',
      options: radio(DIVIDER_CENTRE_SIZES, DIVIDER_CENTRE_SIZE_TITLES),
      hidden: centreIs('icon', 'text', 'image', 'ornament'),
    }),
    defineField({
      name: 'width',
      title: 'Length',
      type: 'string',
      description: 'The whole divider, middle included. Medium while unset.',
      options: radio(DIVIDER_WIDTHS, DIVIDER_WIDTH_TITLES),
      hidden: offOrDots,
    }),
    defineField({
      name: 'thickness',
      title: 'Thickness',
      type: 'string',
      options: radio(DIVIDER_THICKNESSES, DIVIDER_THICKNESS_TITLES),
      hidden: offOrDots,
    }),
    presetField({
      name: 'finish',
      title: 'Finish',
      options: DIVIDER_FINISHES.map((value) => ({
        value,
        title: DIVIDER_FINISH_TITLES[value],
        description: DIVIDER_FINISH_DESCRIPTIONS[value],
        thumbnail: dividerFinishThumbnails[value],
      })),
      // Empty is Flat, so a divider saved before this field existed draws as it did.
      required: false,
      initialValue: null,
      defaultValue: () => 'flat',
      hidden: notGlowable,
    }),
    themeColourField({
      name: 'lineColour',
      title: 'Line colour',
      usage: 'graphic',
      decorative: true,
      inherits: 'the line colour',
      choices: DIVIDER_COLOUR_CHOICES,
      fieldset: 'colours',
      hidden: offOrGradient,
    }),
    themeColourField({
      name: 'centreColour',
      title: 'Colour in the middle',
      usage: 'text',
      decorative: true,
      inherits: 'the line colour',
      choices: DIVIDER_COLOUR_CHOICES,
      fieldset: 'colours',
      // A picture keeps its own colours.
      hidden: centreIs('diamond', 'icon', 'text', 'ornament'),
    }),
  ].map(validateVisible),
  preview: {
    select: { style: 'style', centre: 'centre', text: 'text' },
    prepare: ({ style, centre, text }: { style?: string; centre?: string; text?: string }) => ({
      title: DIVIDER_STYLES.includes(style as never)
        ? DIVIDER_STYLE_TITLES[style as keyof typeof DIVIDER_STYLE_TITLES]
        : 'None',
      subtitle:
        centre === 'text' && text
          ? `“${text}”`
          : centre && centre !== 'none'
            ? DIVIDER_CENTRE_TITLES[centre as keyof typeof DIVIDER_CENTRE_TITLES]
            : undefined,
    }),
  },
})
