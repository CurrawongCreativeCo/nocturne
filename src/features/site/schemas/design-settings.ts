import { ColorWheelIcon } from '@sanity/icons/ColorWheel'
import { defineField, defineType, type StringRule } from 'sanity'

import { HEX_PATTERN } from '@/lib/color/oklch'

import { ColourInput } from '../components/colour-input'
import { DesignSettingsInput } from '../components/design-settings-input'
import { resolveDesignTokens, type DesignOverrides } from '../utils/resolve-design-tokens'

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
