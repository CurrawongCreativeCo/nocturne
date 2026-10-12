import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

/** Internal (reference) or external (URL) link. Reused by CTAs, nav, rich text, etc. */
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'linkType',
      type: 'string',
      initialValue: 'internal',
      options: {
        list: [
          { title: 'Internal page', value: 'internal' },
          { title: 'External URL', value: 'external' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'internal',
      title: 'Page',
      type: 'reference',
      to: [{ type: 'page' }],
      hidden: ({ parent }) => parent?.linkType !== 'internal',
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          (parent as { linkType?: string })?.linkType === 'internal' && !value
            ? 'Select a page'
            : true,
        ),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      hidden: ({ parent }) => parent?.linkType !== 'external',
      validation: (rule) =>
        rule
          .uri({ scheme: ['http', 'https', 'mailto', 'tel'] })
          .custom((value, { parent }) =>
            (parent as { linkType?: string })?.linkType === 'external' && !value
              ? 'Enter a URL'
              : true,
          ),
    }),
    defineField({ name: 'openInNewTab', type: 'boolean', initialValue: false }),
  ],
})
