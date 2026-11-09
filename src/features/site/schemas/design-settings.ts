import { ColorWheelIcon } from '@sanity/icons/ColorWheel'
import { defineField, defineType, type StringRule } from 'sanity'

import { HEX_PATTERN } from '@/lib/color/oklch'
import { resolveDesignTokens, type DesignOverrides } from '@/lib/color/resolve-design-tokens'
import {
  BUTTON_DEPTHS,
  BUTTON_DEPTH_DESCRIPTIONS,
  BUTTON_DEPTH_TITLES,
  BUTTON_FILLS,
  BUTTON_FILL_DESCRIPTIONS,
  BUTTON_FILL_TITLES,
  BUTTON_GLOWS,
  BUTTON_GLOW_DESCRIPTIONS,
  BUTTON_GLOW_TITLES,
  SECONDARY_BUTTONS,
  SECONDARY_BUTTON_DESCRIPTIONS,
  SECONDARY_BUTTON_TITLES,
  EDITORIAL_FONT_NOTE,
  HEADING_STYLE_DESCRIPTIONS,
  HEADING_STYLE_OPTIONS,
  HEADING_STYLE_TITLES,
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
  ButtonDepthFlatThumbnail,
  ButtonDepthRaisedThumbnail,
  ButtonDepthSoftThumbnail,
  ButtonFillGradientThumbnail,
  ButtonFillSolidThumbnail,
  ButtonGlowOffThumbnail,
  ButtonGlowSoftThumbnail,
  ButtonGlowStrongThumbnail,
  SecondaryOutlineThumbnail,
  SecondarySoftThumbnail,
  HeadingClassicThumbnail,
  HeadingEditorialThumbnail,
  HeadingModernThumbnail,
  HeadingStandardThumbnail,
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

/**
 * A hex error, an error when this colour and the background it sits on were both chosen under
 * Advanced and fail text contrast (with "Use suggested colour" in the colour input), and a warning for
 * every other contrast problem. Only this document gets contrast errors: a page or section that did
 * would stop its content being published.
 */
const colourValidation = (field: string) => (rule: StringRule) => [
  rule.custom((value) => !value || HEX_PATTERN.test(value) || HEX_MESSAGE).error(),
  rule
    .custom((_value, { document }) => {
      const failure = resolveDesignTokens(document as DesignOverrides | undefined).errors.find(
        (item) => item.field === field,
      )
      return failure ? failure.message : true
    })
    .error(),
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
  options: { spacingUsage: true },
  components: { input: DesignSettingsInput },
  fieldsets: [
    {
      name: 'buttons',
      title: 'Buttons',
      description:
        'How buttons look across the whole site (agency only). Leave a choice empty to keep the buttons the site has now. Only the main button takes a gradient, depth and glow; the secondary button never glows.',
      options: { collapsible: true, collapsed: true },
    },
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
        'How much room the site gives its sections and side margins. Sections left on Default follow it; a section that chooses Compact or Spacious keeps its own spacing. Leave it empty to keep the spacing the site has now.',
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
    presetField({
      name: 'headingStyle',
      title: 'Heading style',
      description: `The character of every heading: size, weight and letter spacing together. The fonts stay as built. ${EDITORIAL_FONT_NOTE} Leave it empty to keep the headings the site has now.`,
      options: HEADING_STYLE_OPTIONS.map((value) => ({
        value,
        title: HEADING_STYLE_TITLES[value],
        description: HEADING_STYLE_DESCRIPTIONS[value],
        thumbnail: {
          standard: HeadingStandardThumbnail,
          editorial: HeadingEditorialThumbnail,
          modern: HeadingModernThumbnail,
          classic: HeadingClassicThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'standard',
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
    presetField({
      name: 'buttonFill',
      title: 'Main button fill',
      description:
        'Solid is the Primary colour (or the near-black default). Brand gradient fills the button from one of the gradients under Advanced; if its text cannot be read along the whole gradient, or the gradient is removed, the button stays Solid and this field says why.',
      fieldset: 'buttons',
      options: BUTTON_FILLS.map((value) => ({
        value,
        title: BUTTON_FILL_TITLES[value],
        description: BUTTON_FILL_DESCRIPTIONS[value],
        thumbnail: {
          solid: ButtonFillSolidThumbnail,
          gradient: ButtonFillGradientThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'solid',
      hidden: hiddenFromClients,
      validation: (rule) =>
        rule
          .custom((_value, { document }) => {
            const warning = resolveDesignTokens(
              document as DesignOverrides | undefined,
            ).warnings.find((item) => item.field === 'buttonGradient')
            return warning ? warning.message : true
          })
          .warning(),
    }),
    defineField({
      name: 'buttonGradient',
      title: 'Main button gradient',
      type: 'string',
      description:
        'One of the gradients from Advanced. Shown once the fill is Brand gradient and Advanced has a gradient to choose.',
      fieldset: 'buttons',
      options: { documentGradients: true },
      hidden: (context) =>
        hiddenFromClients(context) ||
        (context.document as { buttonFill?: string } | undefined)?.buttonFill !== 'gradient',
    }),
    presetField({
      name: 'buttonDepth',
      title: 'Main button depth',
      description:
        'The shadow under the main button, from the same scale as cards. Leave it empty for no shadow.',
      fieldset: 'buttons',
      options: BUTTON_DEPTHS.map((value) => ({
        value,
        title: BUTTON_DEPTH_TITLES[value],
        description: BUTTON_DEPTH_DESCRIPTIONS[value],
        thumbnail: {
          flat: ButtonDepthFlatThumbnail,
          soft: ButtonDepthSoftThumbnail,
          raised: ButtonDepthRaisedThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'flat',
      hidden: hiddenFromClients,
    }),
    presetField({
      name: 'buttonGlow',
      title: 'Main button glow',
      description:
        'A halo of the Primary colour around the main button only. Decorative, and strongest on a dark section. Leave it empty for no glow.',
      fieldset: 'buttons',
      options: BUTTON_GLOWS.map((value) => ({
        value,
        title: BUTTON_GLOW_TITLES[value],
        description: BUTTON_GLOW_DESCRIPTIONS[value],
        thumbnail: {
          off: ButtonGlowOffThumbnail,
          soft: ButtonGlowSoftThumbnail,
          strong: ButtonGlowStrongThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'off',
      hidden: hiddenFromClients,
    }),
    presetField({
      name: 'secondaryButton',
      title: 'Secondary button style',
      description:
        'The button beside the main one. Outline is a thin line; Soft fill is a light tint. It never has a shadow or glow. Leave it empty for the outline.',
      fieldset: 'buttons',
      options: SECONDARY_BUTTONS.map((value) => ({
        value,
        title: SECONDARY_BUTTON_TITLES[value],
        description: SECONDARY_BUTTON_DESCRIPTIONS[value],
        thumbnail: {
          outline: SecondaryOutlineThumbnail,
          soft: SecondarySoftThumbnail,
        }[value],
      })),
      initialValue: null,
      required: false,
      defaultValue: () => 'outline',
      hidden: hiddenFromClients,
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
