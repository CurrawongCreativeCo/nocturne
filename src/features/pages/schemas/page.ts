import { DocumentIcon } from '@sanity/icons/Document'
import { HomeIcon } from '@sanity/icons/Home'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { HOME_SLUG, slugToPath } from '@/config/paths'
import { ACCESS_MEMBERS } from '@/lib/sanity/access'
import { hiddenFromClients, lockedForClientsOnceSet } from '@/lib/sanity/roles'
import { accessField } from '@/lib/sanity/schema/access-field'

import { sectionTypes } from './sections'
import { reservedSegment } from '../utils/reserved-slug'
import { findDuplicateAnchors } from '../utils/section-anchors'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      // Changing a live page's address breaks links and search results: clients set it once.
      readOnly: lockedForClientsOnceSet,
      description: `Full path without leading slash, e.g. "about" or "services/web-design". Use "${HOME_SLUG}" for the homepage.`,
      options: {
        source: 'title',
        // Default slugify strips "/", which would prevent nested paths.
        slugify: (input) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9/]+/g, '-')
            .replace(/-*\/-*/g, '/')
            .replace(/^[-/]+|[-/]+$/g, ''),
      },
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return true
          if (!SLUG_PATTERN.test(slug.current)) {
            return 'Lowercase letters, numbers, hyphens; "/" separates path segments'
          }
          const taken = reservedSegment(slug.current)
          return taken ? `"${taken}" is used by the site itself; choose another path` : true
        }),
    }),
    defineField({
      ...accessField,
      title: 'Who can see this page',
      description:
        'Members-only pages ask visitors to sign in first, and are left out of the sitemap, search and llms.txt.',
      group: 'content',
    }),
    defineField({
      name: 'minimalLayout',
      title: 'Minimal page (no header or footer)',
      description:
        'Shows just the page: no announcement bar, header or footer. For a link-in-bio page (use the Link page template) or a landing page that should keep visitors on it.',
      type: 'boolean',
      initialValue: false,
      group: 'content',
      // Agency only, like the other design controls: it changes how the whole page is framed.
      hidden: hiddenFromClients,
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'array',
      group: 'content',
      of: [
        ...sectionTypes.map(({ name }) => defineArrayMember({ type: name })),
        // The shared section's own preview supplies the title and section type.
        defineArrayMember({
          type: 'reference',
          title: 'Shared section',
          to: [{ type: 'sharedSection' }],
        }),
      ],
      // An anchor is the section's `id`, so it can be used once per page.
      validation: (rule) =>
        rule.custom((sections) => {
          const duplicates = findDuplicateAnchors(
            sections as Parameters<typeof findDuplicateAnchors>[0],
          )
          return duplicates.length === 0
            ? true
            : duplicates.map(({ key, anchorId }) => ({
                message: `The anchor "${anchorId}" is used by another section on this page`,
                path: [{ _key: key }, 'style', 'anchorId'],
              }))
        }),
      options: {
        insertMenu: {
          // Thumbnails live in public/section-previews/<typeName>.svg.
          views: [
            { name: 'grid', previewImageUrl: (type) => `/section-previews/${type}.svg` },
            { name: 'list' },
          ],
        },
      },
    }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', access: 'access', minimal: 'minimalLayout' },
    prepare: ({
      title,
      slug,
      access,
      minimal,
    }: {
      title?: string
      slug?: string
      access?: string
      minimal?: boolean
    }) => ({
      title: title || 'Untitled',
      subtitle: `${slugToPath(slug)}${access === ACCESS_MEMBERS ? ' · Members only' : ''}${minimal ? ' · Minimal' : ''}`,
      media: slug === HOME_SLUG ? HomeIcon : DocumentIcon,
    }),
  },
})
