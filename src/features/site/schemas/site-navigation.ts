import { MenuIcon } from '@sanity/icons/Menu'
import { defineArrayMember, defineField, defineType } from 'sanity'

/** A singleton: the one document has `_id === 'siteNavigation'` (see SINGLETON_TYPES and the desk structure). */
export const siteNavigation = defineType({
  name: 'siteNavigation',
  title: 'Navigation',
  type: 'document',
  icon: MenuIcon,
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'footer', title: 'Footer' },
  ],
  fields: [
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
  preview: { prepare: () => ({ title: 'Navigation' }) },
})
