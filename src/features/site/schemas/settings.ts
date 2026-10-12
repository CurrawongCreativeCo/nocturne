import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { imageField } from '@/lib/sanity/schema/image-field'

/** Singleton (fixed `_id: "settings"`), pinned in the Studio sidebar. */
export const SETTINGS_ID = 'settings'

export const settings = defineType({
  name: 'settings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'general', title: 'General', default: true },
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
