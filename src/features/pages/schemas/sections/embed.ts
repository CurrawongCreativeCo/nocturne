import { PlugIcon } from '@sanity/icons/Plug'
import { defineField, defineType } from 'sanity'

import {
  CUSTOM_HEIGHT_MAX,
  CUSTOM_HEIGHT_MIN,
  EMBED_HEIGHT_TITLES,
  INLINE_EMBED_PROVIDERS,
  getEmbedProvider,
  resolveEmbed,
} from '@/config/embed-providers'
import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'
import {
  EmbedMediumThumbnail,
  EmbedShortThumbnail,
  EmbedTallThumbnail,
} from '@/lib/sanity/schema/thumbnails/embed-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 over the full content width.
  title: 70,
  // One short paragraph under the heading.
  text: 220,
} as const

type Parent = { provider?: string } | undefined

export const embed = defineType({
  name: 'embed',
  title: 'Embed',
  type: 'object',
  icon: PlugIcon,
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        description:
          'The heading above the embed. It also names the embedded content for screen readers, so say what it is: “Book a consultation”.',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'text',
        title: 'Description',
        type: 'text',
        rows: 3,
        description: 'Optional. Shown under the heading.',
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Descriptions'),
      }),
      defineField({
        name: 'provider',
        type: 'string',
        description:
          'Only these services can be embedded. Visitors see a button first: nothing from the service loads until they press it.',
        options: {
          list: INLINE_EMBED_PROVIDERS.map(({ id, label }) => ({ value: id, title: label })),
          layout: 'radio',
          direction: 'horizontal',
        },
        validation: (rule) => rule.required().error('Choose a service'),
      }),
      defineField({
        name: 'url',
        title: 'Address',
        type: 'url',
        description:
          'Paste the public address from the service. Embed codes and scripts are never used.',
        hidden: ({ parent }) => !(parent as Parent)?.provider,
        validation: (rule) =>
          rule.custom((value, { parent }) => {
            const provider = getEmbedProvider((parent as Parent)?.provider)
            if (!provider) return true
            if (!value) return `Paste the ${provider.label} address`
            return resolveEmbed(provider.id, value)
              ? true
              : `This doesn’t look like a ${provider.label} address. It should look like ${provider.example}`
          }),
      }),
      presetField({
        name: 'height',
        title: 'Height',
        description: 'How tall the embedded content is. Left alone, the height suits the service.',
        required: false,
        initialValue: null,
        // Nothing is stored until an editor picks: the section follows its service, and the picker shows that choice.
        defaultValue: ({ document, path }) =>
          getEmbedProvider(
            (sectionAtStylePath(document, [...path, 'height']) as Parent | undefined)?.provider,
          )?.defaultHeight,
        options: [
          {
            value: 'short',
            title: EMBED_HEIGHT_TITLES.short,
            description: 'A player or a single question.',
            thumbnail: EmbedShortThumbnail,
          },
          {
            value: 'medium',
            title: EMBED_HEIGHT_TITLES.medium,
            description: 'A map or a short form.',
            thumbnail: EmbedMediumThumbnail,
          },
          {
            value: 'tall',
            title: EMBED_HEIGHT_TITLES.tall,
            description: 'A long form.',
            thumbnail: EmbedTallThumbnail,
          },
        ],
        hidden: ({ parent }) => !(parent as Parent)?.provider,
      }),
      accessField,
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
    {
      // Agency only, in the Design tab's collapsed Advanced area.
      advanced: [
        defineField({
          name: 'customHeight',
          title: 'Exact height (px)',
          type: 'number',
          description: `Replaces the height above. ${CUSTOM_HEIGHT_MIN} to ${CUSTOM_HEIGHT_MAX} pixels.`,
          hidden: ({ parent }) => !(parent as Parent)?.provider,
          validation: (rule) => rule.integer().min(CUSTOM_HEIGHT_MIN).max(CUSTOM_HEIGHT_MAX),
        }),
      ],
    },
  ),
  preview: {
    select: { title: 'title', provider: 'provider', tone: 'style.tone' },
    prepare: ({ title, provider, tone }: { title?: string; provider?: string; tone?: string }) => ({
      title: title || 'Untitled',
      subtitle: joinSubtitle('Embed', getEmbedProvider(provider)?.label, toneTitle(tone)),
    }),
  },
})
