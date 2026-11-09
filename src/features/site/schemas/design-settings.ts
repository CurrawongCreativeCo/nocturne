import { ColorWheelIcon } from '@sanity/icons/ColorWheel'
import { defineField, defineType, type StringRule } from 'sanity'

import { HEX_PATTERN } from '@/lib/color/oklch'
import { resolveDesignTokens, type DesignOverrides } from '@/lib/color/resolve-design-tokens'
import {
  DENSITIES,
  DENSITY_DESCRIPTIONS,
  DENSITY_TITLES,
  SHAPES,
  SHAPE_DESCRIPTIONS,
  SHAPE_TITLES,
} from '@/lib/design/site-decision-options'
import { SHADOW_DESCRIPTIONS, SHADOW_LEVELS, SHADOW_TITLES } from '@/lib/sanity/depth-options'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { presetField } from '@/lib/sanity/schema/preset-field'
import {
  DensityAiryThumbnail,
  DensityCompactThumbnail,
  DensityStandardThumbnail,
  ShapeRoundThumbnail,
  ShapeSharpThumbnail,
  ShapeSoftThumbnail,
} from '@/lib/sanity/schema/thumbnails/site-decision-thumbnails'

import { ColourInput } from '../components/colour-input'
import { DesignSettingsInput } from '../components/design-settings-input'

const HEX_MESSAGE = 'Use a six-digit hex colour such as #3266e4'

/** A hex error, plus a warning when the resolved design fails contrast for this field. */
const colourValidation = (field: string) => (rule: StringRule) => [
  rule.custom((value) => !value || HEX_PATTERN.test(value) || HEX_MESSAGE).error(),
  rule
    .custom((_value, { document }) => {
      const warning = resolveDesignTokens(document as DesignOverrides | undefined).warnings.find(
        (item) => item.field === field,
      )
      return warning ? warning.message : true
    })
    .warning(),
]

const colourField = (name: string, title: string, description: string, fieldset?: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    fieldset,
    components: { input: ColourInput },
    validation: colourValidation(name),
  })

/**
 * The public site's brand colours and gradients (README, "Colour systems"). Everything is optional:
 * with nothing set the site looks exactly as src/styles/tokens.json defines it. Rendered by
 * SiteShell as `:root` CSS variables from resolveDesignTokens.
 *
 * A singleton: the one document has `_id === 'designSettings'` (see SINGLETON_TYPES and the desk
 * structure). Agency only through the desk structure, which is a UI convenience, not a permission.
 */
export const designSettings = defineType({
  name: 'designSettings',
  title: 'Brand colours',
  type: 'document',
  icon: ColorWheelIcon,
  components: { input: DesignSettingsInput },
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      description:
        'The full palette and gradients. Leave these empty to keep the defaults, which follow Appearance.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'appearance',
      type: 'string',
      description:
        'Light or dark base. Dark swaps the page and text colours (and the inverse sections).',
      initialValue: 'light',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
      },
    }),
    colourField(
      'primary',
      'Primary',
      'The main brand colour: buttons, links and the accent sections. Text on it is chosen automatically. Until a Primary is set, buttons use the near-black default and accent sections use the default blue shown here.',
    ),
    colourField(
      'secondary',
      'Secondary',
      'A supporting colour for highlights, tags and gradients.',
    ),
    colourField('highlight', 'Highlight', 'Optional. A bright accent for marking a word or badge.'),
    presetField({
      name: 'density',
      title: 'Density',
      description:
        'How much room the site gives its sections and side margins. A section that chooses Compact or Spacious keeps its own spacing. Leave it empty to keep the spacing the site has now.',
      options: DENSITIES.map((value) => ({
        value,
        title: DENSITY_TITLES[value],
        description: DENSITY_DESCRIPTIONS[value],
        thumbnail: {
          compact: DensityCompactThumbnail,
          standard: DensityStandardThumbnail,
          airy: DensityAiryThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'standard',
      hidden: hiddenFromClients,
    }),
    presetField({
      name: 'shape',
      title: 'Shape',
      description:
        'How rounded cards, panels and form controls are, across the site. Buttons keep their shape. Leave it empty to keep the corners the site has now.',
      options: SHAPES.map((value) => ({
        value,
        title: SHAPE_TITLES[value],
        description: SHAPE_DESCRIPTIONS[value],
        thumbnail: {
          sharp: ShapeSharpThumbnail,
          soft: ShapeSoftThumbnail,
          round: ShapeRoundThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'soft',
      hidden: hiddenFromClients,
    }),
    defineField({
      name: 'cardDepth',
      title: 'Card depth',
      type: 'string',
      description:
        'How far cards lift off the page, on every card that does not choose its own depth. Leave it empty to keep each card as it is drawn now. Soft is the shadow most cards have today.',
      hidden: hiddenFromClients,
      options: {
        list: SHADOW_LEVELS.map((level) => ({
          title: `${SHADOW_TITLES[level]}: ${SHADOW_DESCRIPTIONS[level]}`,
          value: level,
        })),
      },
    }),
    colourField('surface', 'Background', 'The page background.', 'advanced'),
    colourField(
      'surfaceAlt',
      'Alternate background',
      'Tinted sections and cards. Follows the background when empty.',
      'advanced',
    ),
    colourField(
      'surfaceInverse',
      'Inverse background',
      'Dark (or, on a dark site, light) sections.',
      'advanced',
    ),
    colourField('ink', 'Text', 'Headings and body text.', 'advanced'),
    colourField(
      'inkMuted',
      'Muted text',
      'Captions and secondary text. Needs 4.5:1 against both backgrounds.',
      'advanced',
    ),
    colourField('line', 'Borders', 'Dividers and card outlines.', 'advanced'),
    defineField({
      name: 'gradients',
      type: 'array',
      description: 'Named gradients of two or three colours, for headings and section backgrounds.',
      fieldset: 'advanced',
      of: [
        defineField({
          name: 'gradient',
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              type: 'string',
              description: 'For example "Sunrise". Used to pick it elsewhere.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'angle',
              type: 'number',
              description: 'Direction in degrees: 90 is left to right, 180 top to bottom.',
              initialValue: 135,
              validation: (rule) => rule.min(0).max(360).integer(),
            }),
            defineField({
              name: 'stops',
              title: 'Colours',
              type: 'array',
              description: 'Two or three colours, in order.',
              of: [
                defineField({ name: 'stop', type: 'string', components: { input: ColourInput } }),
              ],
              validation: (rule) => [
                rule.required().min(2).max(3),
                rule.custom(
                  (stops) =>
                    (stops as string[] | undefined)?.every((stop) => HEX_PATTERN.test(stop)) !==
                      false || HEX_MESSAGE,
                ),
              ],
            }),
          ],
          preview: {
            select: { title: 'name', stops: 'stops' },
            prepare: ({ title, stops }: { title?: string; stops?: string[] }) => ({
              title: title || 'Gradient',
              subtitle: stops?.join(' → '),
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule
          .custom((_value, { document }) => {
            const warning = resolveDesignTokens(
              document as DesignOverrides | undefined,
            ).warnings.find((item) => item.field === 'gradients')
            return warning ? warning.message : true
          })
          .warning(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Brand colours', subtitle: 'Colours and gradients for the site' }),
  },
})
