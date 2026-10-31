import { UserIcon } from '@sanity/icons/User'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { hasLocations, hasServices, hasTeamProfiles } from '@/config/profile'
import { imageField } from '@/lib/sanity/schema/image-field'

import { telHref } from '../utils/phone'
import { MEMBER_SLUG_PATTERN, slugifyMember } from '../utils/slug'
import { TEAM_SOCIAL_PLATFORMS } from '../utils/social'

/** Longest short bio the cards fit (and the most a search result snippet needs). */
export const SHORT_BIO_MAX = 300

/** Fields only a profile page shows: hidden while the site has none, so editors don't fill them in for nothing. */
const profileOnly = () => !hasTeamProfiles()

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  icon: UserIcon,
  fieldsets: [
    {
      name: 'profile',
      title: 'Profile page',
      description: 'Shown on the member’s own page. Leave the address empty for no page.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'contact',
      title: 'Contact details',
      description: 'Shown on the member’s own page. Only add what they are happy to make public.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'role',
      type: 'string',
      description: 'Their job title, e.g. "Principal solicitor".',
    }),
    imageField({
      name: 'portrait',
      aspect: '1:1',
      minWidth: 800,
      description: 'A head-and-shoulders photo works best. Alt text is required.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortBio',
      title: 'Short bio',
      type: 'text',
      rows: 3,
      description: `One or two sentences, shown on the team cards. ${SHORT_BIO_MAX} characters at most.`,
      validation: (rule) =>
        rule.max(SHORT_BIO_MAX).error(`Keep the short bio to ${SHORT_BIO_MAX} characters or fewer`),
    }),
    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      fieldset: 'profile',
      hidden: profileOnly,
      description:
        'The member’s page is at /team/<address>. Empty: no page, and the cards do not link.',
      options: { source: 'name', slugify: slugifyMember },
      validation: (rule) =>
        rule.custom((slug) =>
          !slug?.current || MEMBER_SLUG_PATTERN.test(slug.current)
            ? true
            : 'Lowercase letters, numbers and hyphens only (no "/")',
        ),
    }),
    defineField({
      name: 'bio',
      title: 'Full bio',
      type: 'blockContent',
      fieldset: 'profile',
      hidden: profileOnly,
    }),
    defineField({
      name: 'qualifications',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      fieldset: 'profile',
      hidden: profileOnly,
      description: 'e.g. "LLB (Hons)", "CPA". Press Enter after each one.',
    }),
    defineField({
      name: 'publicEmail',
      title: 'Public email',
      type: 'string',
      fieldset: 'contact',
      hidden: profileOnly,
      validation: (rule) => rule.email().error('Enter a full email address'),
    }),
    defineField({
      name: 'phone',
      type: 'string',
      fieldset: 'contact',
      hidden: profileOnly,
      description: 'Shown as a tap-to-call link.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || telHref(value) ? true : 'Enter a phone number, e.g. 02 9876 5432',
        ),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      fieldset: 'contact',
      hidden: profileOnly,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              options: {
                list: TEAM_SOCIAL_PLATFORMS.map(({ value, title }) => ({ value, title })),
                layout: 'dropdown',
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Link',
              type: 'url',
              validation: (rule) =>
                rule
                  .required()
                  .uri({ scheme: ['https'] })
                  .error('Use a full https:// link'),
            }),
          ],
          preview: {
            select: { platform: 'platform', url: 'url' },
            prepare: ({ platform, url }: { platform?: string; url?: string }) => ({
              title:
                TEAM_SOCIAL_PLATFORMS.find(({ value }) => value === platform)?.title ?? 'Profile',
              subtitle: url,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'socialDisplay',
      title: 'Show social links as',
      type: 'string',
      fieldset: 'contact',
      initialValue: 'icons',
      options: {
        list: [
          { value: 'icons', title: 'Icons' },
          { value: 'text', title: 'Text links' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      hidden: ({ document }) =>
        !hasTeamProfiles() ||
        !(document as { socialLinks?: unknown[] } | undefined)?.socialLinks?.length,
    }),
    defineField({
      name: 'services',
      title: 'Services they provide',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'service' }] })],
      hidden: () => !hasServices(),
      description: 'Their name is listed on each of these services’ pages.',
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'locations',
      title: 'Locations they work at',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'place' }] })],
      hidden: () => !hasLocations(),
      description: 'Their name is listed on each of these locations’ pages.',
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'order',
      type: 'number',
      description:
        'Where they appear in the team: 1 is first. Set by dragging in the Team list, so you rarely need to type it. Members without a number come last.',
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [
    {
      name: 'order',
      title: 'Team order',
      by: [
        { field: 'order', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'portrait' },
  },
})
