import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import {
  DIVIDER_CENTRES,
  DIVIDER_CENTRE_SIZES,
  DIVIDER_CENTRE_SIZE_TITLES,
  DIVIDER_CENTRE_TITLES,
  DIVIDER_COLOUR_CHOICES,
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
import { imageField } from './image-field'
import { lengthWarning } from './length-guidance'
import { presetField } from './preset-field'
import { themeColourField } from './theme-colour'
import { dividerThumbnails } from './thumbnails/divider-thumbnails'
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
const off: ConditionalPropertyCallback = ({ parent }) => isOff(parent)
/** Three dots stand alone: they take no centre and have no length. */
const isOffOrDots = (parent: unknown) => isOff(parent) || divider(parent).style === 'dots'
const offOrDots: ConditionalPropertyCallback = ({ parent }) => isOffOrDots(parent)
const centreIs =
  (...kinds: string[]): ConditionalPropertyCallback =>
  ({ parent }) =>
    isOffOrDots(parent) || !kinds.includes(divider(parent).centre ?? 'none')

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ value, title: titles[value] })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

export const decorativeDivider = defineType({
  name: 'decorativeDivider',
  title: 'Divider',
  type: 'object',
  options: { collapsible: true, collapsed: true },
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
      hidden: centreIs('icon', 'text', 'image'),
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
    themeColourField({
      name: 'lineColour',
      title: 'Line colour',
      usage: 'graphic',
      inherits: 'the line colour',
      choices: DIVIDER_COLOUR_CHOICES,
      fieldset: 'colours',
      hidden: off,
    }),
    themeColourField({
      name: 'centreColour',
      title: 'Colour in the middle',
      usage: 'text',
      inherits: 'the line colour',
      choices: DIVIDER_COLOUR_CHOICES,
      fieldset: 'colours',
      // A picture keeps its own colours.
      hidden: centreIs('diamond', 'icon', 'text'),
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
