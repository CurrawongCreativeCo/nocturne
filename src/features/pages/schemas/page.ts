import { DocumentIcon } from '@sanity/icons/Document'
import { HomeIcon } from '@sanity/icons/Home'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { HOME_SLUG, slugToPath } from '@/config/paths'
import { sectionTypes } from './sections'

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
        rule.required().custom((slug) =>
          !slug?.current || SLUG_PATTERN.test(slug.current)
            ? true
            : 'Lowercase letters, numbers, hyphens; "/" separates path segments',
        ),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'array',
      group: 'content',
      of: sectionTypes.map(({ name }) => defineArrayMember({ type: name })),
      options: {
        insertMenu: { views: [{ name: 'grid' }, { name: 'list' }] },
      },
    }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({
      title: title || 'Untitled',
      subtitle: slugToPath(slug),
      media: slug === HOME_SLUG ? HomeIcon : DocumentIcon,
    }),
  },
})
