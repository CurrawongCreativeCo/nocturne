import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

export const settings = defineType({
  name: 'settings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'announcement', title: 'Announcement' },
    { name: 'header', title: 'Header' },
    { name: 'footer', title: 'Footer' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Site name',
      type: 'string',
      group: 'general',
      description:
        'Shown in the header (when there is no logo) and after every page title in search results.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Default description',
      type: 'text',
      rows: 3,
      group: 'general',
      description:
        'Used for search results and link previews when a page has no description of its own.',
      validation: (rule) => rule.max(160).warning('Descriptions over 160 characters get truncated'),
    }),
    imageField({
      name: 'logo',
      group: 'general',
      // The header announces the logo as the site name, so its alt text is never used.
      requireAlt: false,
      description: 'SVG or transparent PNG. Falls back to the site name.',
    }),
    imageField({
      name: 'ogImage',
      title: 'Default social share image',
      group: 'general',
      requireAlt: false,
      description: '1200×630. Used when a page has no share image of its own.',
    }),
    defineField({
      name: 'announcement',
      title: 'Announcement bar',
      type: 'object',
      group: 'announcement',
      description:
        'A one-line banner above the header. Leave the message empty to show nothing. With no dates it shows all the time.',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'message',
          type: 'string',
          description: 'Up to 120 characters. If you add a link, the whole message is the link.',
          validation: (rule) => rule.required().max(120),
        }),
        defineField({
          name: 'link',
          type: 'link',
          description: 'Optional: where the message leads.',
        }),
        defineField({
          name: 'startsAt',
          title: 'Show from',
          type: 'datetime',
          description: 'Optional. Empty means it is already showing.',
        }),
        defineField({
          name: 'endsAt',
          title: 'Show until',
          type: 'datetime',
          description: 'Optional. The bar disappears after this time; empty means no end.',
          validation: (rule) =>
            rule.custom((value, { parent }) => {
              const startsAt = (parent as { startsAt?: string } | undefined)?.startsAt
              return value && startsAt && value <= startsAt
                ? '"Show until" must be after "Show from"'
                : true
            }),
        }),
        defineField({
          name: 'dismissible',
          title: 'Visitors can dismiss it',
          type: 'boolean',
          description:
            'Adds a close button. It stays closed in that browser until the message changes.',
          initialValue: false,
        }),
      ],
    }),
    defineField({
      name: 'headerNav',
      title: 'Header menu',
      type: 'array',
      group: 'header',
      of: [defineArrayMember({ type: 'navItem' })],
      validation: (rule) => rule.max(7),
    }),
    defineField({ name: 'headerCta', title: 'Header button', type: 'cta', group: 'header' }),
    defineField({
      name: 'footerNav',
      title: 'Footer links',
      type: 'array',
      group: 'footer',
      of: [defineArrayMember({ type: 'navItem' })],
    }),
    defineField({
      name: 'footerText',
      type: 'string',
      group: 'footer',
      description:
        'e.g. "Acme Ltd. All rights reserved." Shown after "© <current year>". Defaults to the site name.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
})
