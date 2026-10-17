import { ComposeIcon } from '@sanity/icons/Compose'
import { defineArrayMember, defineField, defineType, type PreviewValue } from 'sanity'

import { siteLanguage } from '@/config/env'
import { imageField } from '@/lib/sanity/schema/image-field'

import { formatDate } from '../utils/format-date'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: ComposeIcon,
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
      description: 'The address: /blog/<slug>. One lowercase word or hyphenated words.',
      options: { source: 'title' },
      validation: (rule) =>
        rule
          .required()
          .custom((slug) =>
            !slug?.current || SLUG_PATTERN.test(slug.current)
              ? true
              : 'Lowercase letters, numbers and hyphens only',
          ),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'Summary shown on the blog index, in the RSS feed and as the search description unless the SEO group has one.',
      validation: (rule) =>
        rule
          .required()
          .max(300)
          .warning('Summaries over 300 characters make the blog index uneven'),
    }),
    imageField({
      name: 'mainImage',
      title: 'Main image',
      group: 'content',
      description: 'Shown at the top of the post and on its card. Also the default share image.',
      validation: (rule) => rule.required(),
    }),
    // The article straight after its picture; the details that file it come after (docs/editor-guide/write-a-blog-post.md).
    defineField({
      name: 'body',
      type: 'blockContent',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'categories',
      type: 'array',
      group: 'content',
      description:
        'Related posts are chosen by shared categories, so give every post at least one.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'author',
      type: 'reference',
      group: 'content',
      to: [{ type: 'author' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'content',
      description:
        'Sets the order on the blog and the date shown. Publish the document when it should go live, or schedule it with a release.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', date: 'publishedAt', author: 'author.name', media: 'mainImage' },
    prepare: ({
      title,
      date,
      author,
      media,
    }: {
      title?: string
      date?: string
      author?: string
      media?: PreviewValue['media']
    }) => ({
      title: title || 'Untitled',
      // "17 October 2026 · Sam Lee": the date as the blog shows it, which also sets the post order.
      subtitle: [date ? formatDate(date, siteLanguage) : undefined, author]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
