import { defineField, defineType } from 'sanity'

import { imageField } from './image-field'
import { SeoInput } from './seo-preview/seo-input'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  components: { input: SeoInput },
  fields: [
    defineField({
      name: 'metaTitle',
      type: 'string',
      description: 'Falls back to the page title.',
      validation: (rule) => rule.max(60).warning('Titles over 60 characters get truncated'),
    }),
    defineField({
      name: 'metaDescription',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160).warning('Descriptions over 160 characters get truncated'),
    }),
    imageField({
      name: 'ogImage',
      title: 'Social share image',
      requireAlt: false,
      description: '1200×630',
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
