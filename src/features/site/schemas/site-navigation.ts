import { MenuIcon } from '@sanity/icons/Menu'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { hiddenFromClients } from '@/lib/sanity/roles'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { socialStyleThumbnails } from '@/lib/sanity/schema/thumbnails/link-design-thumbnails'
import { SOCIAL_STYLES, SOCIAL_STYLE_TITLES } from '@/lib/sanity/social-style-options'

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
      description:
        'The links across the top of every page, in this order. Up to seven fit on a laptop; put the rest in the footer.',
      type: 'array',
      group: 'header',
      of: [defineArrayMember({ type: 'navItem' })],
      validation: (rule) => rule.max(7),
    }),
    defineField({
      name: 'headerCta',
      title: 'Header button',
      description:
        'Optional. One button after the menu links, such as "Book a call". Also shown in the phone menu.',
      type: 'cta',
      group: 'header',
    }),
    defineField({
      name: 'footerNav',
      title: 'Footer links',
      description:
        'Links along the bottom of every page: policies, contact and anything not in the header.',
      type: 'array',
      group: 'footer',
      of: [defineArrayMember({ type: 'navItem' })],
    }),
    defineField({
      name: 'footerText',
      title: 'Copyright line',
      type: 'string',
      group: 'footer',
      description:
        'e.g. "Acme Ltd. All rights reserved." Shown after "© <current year>". Defaults to the site name.',
    }),
    // Agency only: the icons come from Business info, so editors change them there.
    defineField({
      name: 'footerShowSocial',
      title: 'Show social icons',
      type: 'boolean',
      group: 'footer',
      description:
        'Adds a row of the social profiles in Business info above the copyright line. Off, the footer is unchanged.',
      initialValue: false,
      hidden: hiddenFromClients,
    }),
    presetField({
      name: 'footerSocialStyle',
      title: 'Social icon style',
      group: 'footer',
      options: SOCIAL_STYLES.map((value) => ({
        value,
        title: SOCIAL_STYLE_TITLES[value],
        thumbnail: socialStyleThumbnails[value],
      })),
      required: false,
      initialValue: 'plain',
      hidden: (context) =>
        hiddenFromClients(context) ||
        !(context.document as { footerShowSocial?: boolean } | undefined)?.footerShowSocial,
    }),
  ],
  preview: { prepare: () => ({ title: 'Navigation' }) },
})
