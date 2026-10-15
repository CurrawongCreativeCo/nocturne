import { LockIcon } from '@sanity/icons/Lock'
import { defineField, defineType } from 'sanity'

/** A singleton: the one document has `_id === 'cookieBanner'` (see SINGLETON_TYPES and the desk structure). */
export const cookieBanner = defineType({
  name: 'cookieBanner',
  title: 'Cookie banner',
  type: 'document',
  icon: LockIcon,
  description:
    'The text of the cookie banner. It only appears when an analytics provider is set up for the site (see the README). Leave a field empty to use the default wording.',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'Default: "Cookies on this site".',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'message',
      type: 'text',
      rows: 3,
      description:
        'Say what the cookies are for in plain words. Default: "We use analytics cookies to see how the site is used. They are off unless you accept."',
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: 'privacyLabel',
      title: 'Privacy policy link text',
      type: 'string',
      description: 'Default: "Privacy policy". Only shown when there is a link below.',
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: 'privacyLink',
      title: 'Privacy policy link',
      type: 'link',
      description: 'Where visitors read how their data is used. Strongly recommended.',
    }),
    defineField({
      name: 'analyticsText',
      title: 'Analytics description',
      type: 'string',
      description:
        'Shown beside the Analytics choice. Default: "Helps us understand how the site is used."',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'marketingText',
      title: 'Marketing description',
      type: 'string',
      description:
        'Shown beside the Marketing choice. Default: "Used to measure and personalise advertising."',
      validation: (rule) => rule.max(120),
    }),
  ],
  preview: { prepare: () => ({ title: 'Cookie banner' }) },
})
