import { defineField } from 'sanity'

import {
  INLINE_COLOUR_CHOICES,
  INLINE_SEPARATORS,
  INLINE_SEPARATOR_TITLES,
  inlineListItems,
} from '@/lib/sanity/inline-list-options'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { themeColourField } from '@/lib/sanity/schema/theme-colour'
import { inlineListThumbnails } from '@/lib/sanity/schema/thumbnails/inline-list-thumbnails'

/** A small Design box only for an explicit list; the ordinary eyebrow stays as it was. */
export const heroEyebrowDesignField = defineField({
  name: 'eyebrowDesign',
  title: 'Eyebrow labels',
  type: 'object',
  group: 'design',
  description: 'Small capitals with bullets in Primary. Follows the hero’s alignment.',
  hidden: (context) =>
    hiddenFromClients(context) ||
    inlineListItems((context.parent as { eyebrowLabels?: string[] } | undefined)?.eyebrowLabels)
      .length === 0,
  options: { collapsible: true, collapsed: false },
  fieldsets: [
    { name: 'advanced', title: 'Advanced', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    presetField({
      name: 'separator',
      title: 'Separator',
      required: false,
      initialValue: null,
      defaultValue: () => 'bullet',
      options: INLINE_SEPARATORS.map((value) => ({
        value,
        title: INLINE_SEPARATOR_TITLES[value],
        thumbnail: inlineListThumbnails[value],
      })),
    }),
    themeColourField({
      name: 'textColour',
      title: 'Label colour',
      usage: 'text',
      inherits: 'the hero’s eyebrow colour',
      choices: INLINE_COLOUR_CHOICES,
      fieldset: 'advanced',
    }),
    themeColourField({
      name: 'separatorColour',
      title: 'Separator colour',
      usage: 'graphic',
      decorative: true,
      inherits: 'Primary',
      choices: INLINE_COLOUR_CHOICES,
      fieldset: 'advanced',
      hidden: ({ parent }) => (parent as { separator?: string } | undefined)?.separator === 'none',
    }),
  ],
})
