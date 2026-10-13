import { DocumentIcon } from '@sanity/icons/Document'
import { HomeIcon } from '@sanity/icons/Home'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BLOG_SEGMENT, HOME_SLUG, slugToPath } from '@/config/paths'

import { sectionTypes } from './sections'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/
/** First path segments taken by app routes: a page there could never be reached. */
const RESERVED_SEGMENTS = new Set(['studio', 'api', '_next', BLOG_SEGMENT])

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
          const first = slug.current.split('/')[0] ?? ''
          return RESERVED_SEGMENTS.has(first)
            ? `"${first}" is used by the site itself; choose another path`
            : true
        }),
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
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }: { title?: string; slug?: string }) => ({
      title: title || 'Untitled',
      subtitle: slugToPath(slug),
      media: slug === HOME_SLUG ? HomeIcon : DocumentIcon,
    }),
  },
})
