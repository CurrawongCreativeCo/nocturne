import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

import { categoryPath } from '@/config/paths'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      description: 'Used in the address: /blog/category/<slug>.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }: { title?: string; slug?: string }) => ({
      title: title || 'Untitled',
      subtitle: slug ? categoryPath(slug) : undefined,
    }),
  },
})
